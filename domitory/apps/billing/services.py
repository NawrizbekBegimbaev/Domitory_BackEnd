from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.billing.models import Charge, Payment, PaymentAllocation
from apps.residents.models import Resident


class ChargeService:

    @staticmethod
    @transaction.atomic
    def generate_monthly_charges(organization, tariff_plan, month, year):
        """Generate charges for all active residents in an organization."""
        residents = Resident.objects.filter(
            organization=organization,
            status=Resident.Status.ACTIVE,
        )

        created = 0
        skipped = 0
        for resident in residents:
            _, was_created = Charge.objects.get_or_create(
                resident=resident,
                period_month=month,
                period_year=year,
                defaults={
                    'tariff_plan': tariff_plan,
                    'amount': tariff_plan.amount,
                    'due_date': timezone.datetime(year, month, 25).date(),
                },
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        return {'created': created, 'skipped': skipped}


class PaymentService:

    @staticmethod
    @transaction.atomic
    def record_payment(resident, amount, payment_date, payment_method, recorded_by, notes=''):
        """Record a manual payment and auto-allocate using FIFO."""
        payment = Payment.objects.create(
            resident=resident,
            amount=amount,
            payment_date=payment_date,
            payment_method=payment_method,
            recorded_by=recorded_by,
            notes=notes,
        )

        # FIFO allocation
        remaining = Decimal(str(amount))
        unpaid_charges = Charge.objects.filter(
            resident=resident,
            status__in=[
                Charge.Status.PENDING,
                Charge.Status.OVERDUE,
                Charge.Status.PARTIALLY_PAID,
            ],
        ).order_by('period_year', 'period_month')

        for charge in unpaid_charges:
            if remaining <= 0:
                break

            charge_remaining = charge.remaining
            if charge_remaining <= 0:
                continue

            alloc_amount = min(remaining, charge_remaining)
            PaymentAllocation.objects.create(
                payment=payment,
                charge=charge,
                amount=alloc_amount,
            )
            remaining -= alloc_amount

            # Update charge status
            new_paid = charge.paid_amount
            if new_paid >= charge.amount:
                charge.status = Charge.Status.PAID
            else:
                charge.status = Charge.Status.PARTIALLY_PAID
            charge.save(update_fields=['status'])

        AuditService.log(recorded_by, 'create', payment, {
            'resident': str(resident),
            'amount': str(amount),
            'method': payment_method,
        })

        return payment


class BalanceService:

    @staticmethod
    def get_resident_balance(resident):
        """Calculate total debt for a resident.

        debt = SUM(unpaid charges) - SUM(allocations for those same charges)
        """
        unpaid_statuses = [
            Charge.Status.PENDING,
            Charge.Status.OVERDUE,
            Charge.Status.PARTIALLY_PAID,
        ]

        unpaid_charges = Charge.objects.filter(
            resident=resident,
            status__in=unpaid_statuses,
        )

        total_charges = unpaid_charges.aggregate(
            total=models.Sum('amount'),
        )['total'] or Decimal('0')

        total_allocated = PaymentAllocation.objects.filter(
            charge__in=unpaid_charges,
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        total_payments = Payment.objects.filter(
            resident=resident,
            status=Payment.Status.COMPLETED,
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        return {
            'total_charges': total_charges,
            'total_paid': total_allocated,
            'total_payments': total_payments,
            'debt': total_charges - total_allocated,
        }
