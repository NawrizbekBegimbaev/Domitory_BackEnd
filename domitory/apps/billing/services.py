import calendar
import datetime
from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.billing.models import Charge, Payment, PaymentAllocation


class FIFOAllocator:
    """Shared FIFO re-allocation utility."""

    @staticmethod
    @transaction.atomic
    def reallocate_all_payments(resident):
        """Clear all allocations and re-run FIFO for a resident."""
        PaymentAllocation.objects.filter(
            charge__resident=resident,
        ).exclude(charge__status=Charge.Status.CANCELLED).delete()

        Charge.objects.filter(
            resident=resident,
        ).exclude(status=Charge.Status.CANCELLED).update(status=Charge.Status.PENDING)

        all_payments = Payment.objects.filter(
            resident=resident, status=Payment.Status.COMPLETED,
        ).order_by('payment_date', 'created_at')

        for payment in all_payments:
            remaining = payment.amount
            charges = Charge.objects.filter(
                resident=resident,
                status__in=[Charge.Status.PENDING, Charge.Status.PARTIALLY_PAID],
            ).order_by('period_year', 'period_month', 'start_day')

            for charge in charges:
                if remaining <= 0:
                    break
                already = PaymentAllocation.objects.filter(charge=charge).aggregate(
                    total=models.Sum('amount'))['total'] or Decimal('0')
                left = charge.amount - already
                if left <= 0:
                    continue
                alloc = min(remaining, left)
                PaymentAllocation.objects.create(payment=payment, charge=charge, amount=alloc)
                remaining -= alloc
                new_total = already + alloc
                charge.status = Charge.Status.PAID if new_total >= charge.amount else Charge.Status.PARTIALLY_PAID
                charge.save(update_fields=['status'])


class ChargeService:

    @staticmethod
    @transaction.atomic
    def generate_charges_for_assignment(contract, room, start_date_override=None, price_override=None):
        """Generate pro-rata charges based on contract period and room price.

        Creates charges with proportional amounts for partial months.
        Full months get full monthly_price (or price_override if set).
        price_override: used when resident buys multiple beds.
        """
        start = start_date_override or contract.start_date
        end = contract.end_date
        if isinstance(start, str):
            start = datetime.date.fromisoformat(start)
        if isinstance(end, str):
            end = datetime.date.fromisoformat(end)
        price = price_override if price_override is not None else room.monthly_price

        if price <= 0:
            return 0

        created = 0
        current = datetime.date(start.year, start.month, 1)

        # Include end month
        if end.day > 1:
            if end.month == 12:
                end_boundary = datetime.date(end.year + 1, 1, 1)
            else:
                end_boundary = datetime.date(end.year, end.month + 1, 1)
        else:
            end_boundary = datetime.date(end.year, end.month, 1)

        while current < end_boundary:
            month = current.month
            year = current.year
            days_in_month = calendar.monthrange(year, month)[1]

            # Determine start_day and end_day for this month
            if year == start.year and month == start.month:
                s_day = start.day
            else:
                s_day = 1

            if year == end.year and month == end.month:
                e_day = min(end.day, days_in_month)
            else:
                e_day = days_in_month

            days = e_day - s_day + 1
            is_partial = days < days_in_month
            amount = Charge.calculate_prorated_amount(price, year, month, s_day, e_day)

            due = datetime.date(year, month, min(25, days_in_month))
            if due < start:
                due = start

            # Check existing charge for this resident+month+room
            existing = Charge.objects.filter(
                resident=contract.resident,
                period_month=month,
                period_year=year,
                room=room,
            ).first()

            if existing:
                if existing.status == Charge.Status.CANCELLED:
                    PaymentAllocation.objects.filter(charge=existing).delete()
                    existing.amount = amount
                    existing.start_day = s_day
                    existing.end_day = e_day
                    existing.days_charged = days
                    existing.is_prorated = is_partial
                    existing.status = Charge.Status.PENDING
                    existing.due_date = due
                    existing.save(update_fields=[
                        'amount', 'start_day', 'end_day', 'days_charged',
                        'is_prorated', 'status', 'due_date',
                    ])
                    created += 1
                elif existing.amount != amount:
                    PaymentAllocation.objects.filter(charge=existing).delete()
                    existing.amount = amount
                    existing.start_day = s_day
                    existing.end_day = e_day
                    existing.days_charged = days
                    existing.is_prorated = is_partial
                    existing.status = Charge.Status.PENDING
                    existing.save(update_fields=[
                        'amount', 'start_day', 'end_day', 'days_charged',
                        'is_prorated', 'status',
                    ])
                    created += 1
            else:
                # Also check for old charges without room (backward compat)
                old_charge = Charge.objects.filter(
                    resident=contract.resident,
                    period_month=month,
                    period_year=year,
                    room__isnull=True,
                ).first()
                if old_charge:
                    PaymentAllocation.objects.filter(charge=old_charge).delete()
                    old_charge.room = room
                    old_charge.amount = amount
                    old_charge.start_day = s_day
                    old_charge.end_day = e_day
                    old_charge.days_charged = days
                    old_charge.is_prorated = is_partial
                    old_charge.status = Charge.Status.PENDING
                    old_charge.due_date = due
                    old_charge.save(update_fields=[
                        'room', 'amount', 'start_day', 'end_day', 'days_charged',
                        'is_prorated', 'status', 'due_date',
                    ])
                    created += 1
                else:
                    Charge.objects.create(
                        resident=contract.resident,
                        room=room,
                        period_month=month,
                        period_year=year,
                        amount=amount,
                        start_day=s_day,
                        end_day=e_day,
                        days_charged=days,
                        is_prorated=is_partial,
                        due_date=due,
                        status=Charge.Status.PENDING,
                    )
                    created += 1

            # Next month
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

        # FIFO allocation — order by year, month, start_day
        remaining = Decimal(str(amount))
        unpaid_charges = Charge.objects.filter(
            resident=resident,
            status__in=[
                Charge.Status.PENDING,
                Charge.Status.OVERDUE,
                Charge.Status.PARTIALLY_PAID,
            ],
        ).order_by('period_year', 'period_month', 'start_day')

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
        active_charges = Charge.objects.filter(
            resident=resident,
        ).exclude(status=Charge.Status.CANCELLED)

        total_charges = active_charges.aggregate(
            total=models.Sum('amount'),
        )['total'] or Decimal('0')

        total_payments = Payment.objects.filter(
            resident=resident,
            status=Payment.Status.COMPLETED,
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        total_allocated = PaymentAllocation.objects.filter(
            charge__resident=resident,
        ).exclude(
            charge__status=Charge.Status.CANCELLED,
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        debt = total_charges - total_payments

        return {
            'total_charges': total_charges,
            'total_paid': total_allocated,
            'total_payments': total_payments,
            'debt': debt,
        }
