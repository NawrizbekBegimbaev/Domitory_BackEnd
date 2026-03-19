from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.billing.models import Charge, Payment, PaymentAllocation


class ChargeService:

    @staticmethod
    @transaction.atomic
    def generate_charges_for_assignment(contract, room):
        """Auto-generate monthly charges based on contract period and room price.

        Creates one Charge per month from contract.start_date to contract.end_date.
        Amount = room.monthly_price. Status = pending (immediate debt).
        """
        import datetime

        start = contract.start_date
        end = contract.end_date
        # Ensure date objects (not strings)
        if isinstance(start, str):
            start = datetime.date.fromisoformat(start)
        if isinstance(end, str):
            end = datetime.date.fromisoformat(end)
        price = room.monthly_price

        if price <= 0:
            return 0

        created = 0
        current = datetime.date(start.year, start.month, 1)
        # Include end month if end_date is not the 1st (resident lives part of that month)
        if end.day > 1:
            # Include end month
            if end.month == 12:
                end_boundary = datetime.date(end.year + 1, 1, 1)
            else:
                end_boundary = datetime.date(end.year, end.month + 1, 1)
        else:
            end_boundary = datetime.date(end.year, end.month, 1)

        while current < end_boundary:
            month = current.month
            year = current.year
            due = datetime.date(year, month, 25)
            if due < start:
                due = start

            existing = Charge.objects.filter(
                resident=contract.resident,
                period_month=month,
                period_year=year,
            ).first()

            if existing:
                if existing.status == Charge.Status.CANCELLED:
                    # Reactivate cancelled charge with new price
                    from apps.billing.models import PaymentAllocation
                    PaymentAllocation.objects.filter(charge=existing).delete()
                    existing.amount = price
                    existing.status = Charge.Status.PENDING
                    existing.due_date = due
                    existing.save(update_fields=['amount', 'status', 'due_date'])
                    created += 1
                elif existing.amount != price:
                    # Different room price — update charge amount
                    # Clear allocations so FIFO can re-distribute
                    from apps.billing.models import PaymentAllocation
                    PaymentAllocation.objects.filter(charge=existing).delete()
                    existing.amount = price
                    existing.status = Charge.Status.PENDING
                    existing.save(update_fields=['amount', 'status'])
                    created += 1
                # else: same price, already exists — skip
            else:
                Charge.objects.create(
                    resident=contract.resident,
                    period_month=month,
                    period_year=year,
                    amount=price,
                    due_date=due,
                    status=Charge.Status.PENDING,
                )
                created += 1

            # Move to next month
            if current.month == 12:
                current = datetime.date(current.year + 1, 1, 1)
            else:
                current = datetime.date(current.year, current.month + 1, 1)

        return created


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
        # All non-cancelled charges
        active_charges = Charge.objects.filter(
            resident=resident,
        ).exclude(status=Charge.Status.CANCELLED)

        total_charges = active_charges.aggregate(
            total=models.Sum('amount'),
        )['total'] or Decimal('0')

        # All completed payments
        total_payments = Payment.objects.filter(
            resident=resident,
            status=Payment.Status.COMPLETED,
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        # Total allocated to charges
        total_allocated = PaymentAllocation.objects.filter(
            charge__resident=resident,
        ).exclude(
            charge__status=Charge.Status.CANCELLED,
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        # debt > 0 means owes money, debt < 0 means overpayment
        debt = total_charges - total_payments

        return {
            'total_charges': total_charges,
            'total_paid': total_allocated,
            'total_payments': total_payments,
            'debt': debt,
        }
