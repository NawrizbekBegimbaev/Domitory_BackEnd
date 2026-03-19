from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.inventory.services import RoomService
from apps.occupancy.models import AccommodationContract, RoomAssignment, StayRecord
from apps.residents.models import Resident


class ContractService:

    @staticmethod
    @transaction.atomic
    def terminate_contract(contract, user=None):
        old_status = contract.status
        contract.status = AccommodationContract.Status.TERMINATED
        contract.save(update_fields=['status'])

        # Close all active assignments and free rooms
        active_assignments = RoomAssignment.objects.filter(
            contract=contract, status=RoomAssignment.Status.ACTIVE,
        ).select_related('room')
        for assignment in active_assignments:
            assignment.status = RoomAssignment.Status.COMPLETED
            assignment.end_date = timezone.now().date()
            assignment.save(update_fields=['status', 'end_date'])
            RoomService.decrement_occupancy(assignment.room)

        # Cancel future unpaid charges and refund overpayment
        ContractService._refund_on_termination(contract, user)

        # Update resident status
        contract.resident.status = Resident.Status.EVICTED
        contract.resident.save(update_fields=['status'])

        if user:
            AuditService.log(user, 'update', contract, {'status': {'old': old_status, 'new': 'terminated'}})
        return contract

    @staticmethod
    def _refund_on_termination(contract, user=None):
        """Cancel future charges and refund overpayment.

        1. Cancel all PENDING charges for months AFTER current month
        2. Remove allocations pointing to cancelled charges
        3. Re-run FIFO allocation for remaining charges
        4. Any leftover payment amount stays as positive balance
        """
        import datetime
        from decimal import Decimal
        from apps.billing.models import Charge, Payment, PaymentAllocation

        today = timezone.now().date()
        resident = contract.resident

        # Cancel future charges (next month onwards) regardless of payment status
        future_charges = Charge.objects.filter(
            resident=resident,
        ).exclude(
            status=Charge.Status.CANCELLED,
        ).filter(
            models.Q(period_year__gt=today.year) |
            models.Q(period_year=today.year, period_month__gt=today.month)
        )

        cancelled_count = 0
        for charge in future_charges:
            PaymentAllocation.objects.filter(charge=charge).delete()
            charge.status = Charge.Status.CANCELLED
            charge.save(update_fields=['status'])
            cancelled_count += 1

        if cancelled_count == 0:
            return

        # Re-run FIFO for all remaining non-cancelled charges
        active_charges = Charge.objects.filter(
            resident=resident,
        ).exclude(status=Charge.Status.CANCELLED).order_by('period_year', 'period_month')

        # Clear all allocations and reset statuses
        PaymentAllocation.objects.filter(charge__resident=resident, charge__status__in=[
            Charge.Status.PENDING, Charge.Status.OVERDUE,
            Charge.Status.PARTIALLY_PAID, Charge.Status.PAID,
        ]).delete()
        active_charges.update(status=Charge.Status.PENDING)

        # Re-allocate all payments
        all_payments = Payment.objects.filter(
            resident=resident,
            status=Payment.Status.COMPLETED,
        ).order_by('payment_date', 'created_at')

        for payment in all_payments:
            remaining = payment.amount
            pending = Charge.objects.filter(
                resident=resident,
                status__in=[Charge.Status.PENDING, Charge.Status.PARTIALLY_PAID],
            ).exclude(status=Charge.Status.CANCELLED).order_by('period_year', 'period_month')

            for charge in pending:
                if remaining <= 0:
                    break
                already_paid = PaymentAllocation.objects.filter(charge=charge).aggregate(
                    total=models.Sum('amount')
                )['total'] or Decimal('0')
                charge_remaining = charge.amount - already_paid
                if charge_remaining <= 0:
                    continue

                alloc = min(remaining, charge_remaining)
                PaymentAllocation.objects.create(payment=payment, charge=charge, amount=alloc)
                remaining -= alloc

                new_total = already_paid + alloc
                if new_total >= charge.amount:
                    charge.status = Charge.Status.PAID
                else:
                    charge.status = Charge.Status.PARTIALLY_PAID
                charge.save(update_fields=['status'])


class RoomAssignmentService:

    @staticmethod
    @transaction.atomic
    def assign_resident_to_room(resident, room, contract, assigned_by):
        if RoomAssignment.objects.filter(
            resident=resident, status=RoomAssignment.Status.ACTIVE,
        ).exists():
            raise ValidationError('Resident already has an active room assignment.')

        if contract.status != AccommodationContract.Status.ACTIVE:
            raise ValidationError('Contract is not active.')

        RoomService.validate_capacity(room)
        RoomService.validate_gender_policy(room, resident)

        assignment = RoomAssignment.objects.create(
            contract=contract,
            resident=resident,
            room=room,
            start_date=timezone.now().date(),
            assigned_by=assigned_by,
        )

        RoomService.increment_occupancy(room)
        StayRecord.objects.create(
            resident=resident,
            check_in_at=timezone.now(),
            reason=StayRecord.Reason.INITIAL_CHECK_IN,
            recorded_by=assigned_by,
        )

        # Reactivate resident if evicted/suspended
        if resident.status != Resident.Status.ACTIVE:
            resident.status = Resident.Status.ACTIVE
            resident.save(update_fields=['status'])

        # Auto-generate charges based on contract period + room price
        from apps.billing.services import ChargeService
        ChargeService.generate_charges_for_assignment(contract, room)

        # Auto-allocate existing overpayment to new charges (FIFO)
        RoomAssignmentService._allocate_overpayment(resident)

        AuditService.log(assigned_by, 'create', assignment, {
            'resident': str(resident),
            'room': str(room.room_number),
        })

        return assignment

    @staticmethod
    def _allocate_overpayment(resident):
        """Re-run FIFO allocation for all payments against all active charges."""
        from decimal import Decimal
        from apps.billing.models import Charge, Payment, PaymentAllocation

        # Clear all allocations and reset non-cancelled charges
        PaymentAllocation.objects.filter(
            charge__resident=resident,
        ).exclude(charge__status=Charge.Status.CANCELLED).delete()

        Charge.objects.filter(
            resident=resident,
        ).exclude(status=Charge.Status.CANCELLED).update(status=Charge.Status.PENDING)

        # Re-allocate all payments FIFO
        all_payments = Payment.objects.filter(
            resident=resident,
            status=Payment.Status.COMPLETED,
        ).order_by('payment_date', 'created_at')

        for payment in all_payments:
            remaining = payment.amount
            pending = Charge.objects.filter(
                resident=resident,
                status__in=[Charge.Status.PENDING, Charge.Status.PARTIALLY_PAID],
            ).order_by('period_year', 'period_month')

            for charge in pending:
                if remaining <= 0:
                    break
                already = PaymentAllocation.objects.filter(charge=charge).aggregate(
                    total=models.Sum('amount')
                )['total'] or Decimal('0')
                charge_left = charge.amount - already
                if charge_left <= 0:
                    continue

                alloc = min(remaining, charge_left)
                PaymentAllocation.objects.create(payment=payment, charge=charge, amount=alloc)
                remaining -= alloc

                new_total = already + alloc
                if new_total >= charge.amount:
                    charge.status = Charge.Status.PAID
                else:
                    charge.status = Charge.Status.PARTIALLY_PAID
                charge.save(update_fields=['status'])

    @staticmethod
    @transaction.atomic
    def evict_resident(assignment, user=None):
        now = timezone.now()

        assignment.end_date = now.date()
        assignment.status = RoomAssignment.Status.COMPLETED
        assignment.save(update_fields=['end_date', 'status'])

        RoomService.decrement_occupancy(assignment.room)
        ContractService.terminate_contract(assignment.contract, user)

        resident = assignment.resident
        resident.status = Resident.Status.EVICTED
        resident.save(update_fields=['status'])

        StayRecord.objects.create(
            resident=resident,
            check_out_at=now,
            reason=StayRecord.Reason.EVICTION,
            recorded_by=user,
        )

        if user:
            AuditService.log(user, 'update', assignment, {
                'action': 'eviction',
                'resident': str(resident),
            })

        return assignment

    @staticmethod
    @transaction.atomic
    def transfer_resident(assignment, new_room, user=None):
        now = timezone.now()
        resident = assignment.resident

        RoomService.validate_capacity(new_room)
        RoomService.validate_gender_policy(new_room, resident)

        old_room = assignment.room
        assignment.end_date = now.date()
        assignment.status = RoomAssignment.Status.TRANSFERRED
        assignment.save(update_fields=['end_date', 'status'])
        RoomService.decrement_occupancy(old_room)

        new_assignment = RoomAssignment.objects.create(
            contract=assignment.contract,
            resident=resident,
            room=new_room,
            start_date=now.date(),
            assigned_by=user,
        )
        RoomService.increment_occupancy(new_room)

        StayRecord.objects.create(
            resident=resident,
            check_in_at=now,
            reason=StayRecord.Reason.TRANSFER,
            recorded_by=user,
        )

        # Recalculate charges for remaining months
        RoomAssignmentService._recalculate_charges_on_transfer(
            resident, old_room, new_room, now.date(), assignment.contract,
        )

        if user:
            AuditService.log(user, 'create', new_assignment, {
                'action': 'transfer',
                'from_room': str(old_room.room_number),
                'to_room': str(new_room.room_number),
                'old_price': str(old_room.monthly_price),
                'new_price': str(new_room.monthly_price),
            })

        return new_assignment

    @staticmethod
    def _recalculate_charges_on_transfer(resident, old_room, new_room, transfer_date, contract):
        """Recalculate charges from current month onwards on room transfer.

        For each remaining month (from transfer_date to contract end):
        - Delete old allocations for that charge
        - Update charge amount to new room price
        - Reset status to pending (so FIFO can re-allocate)

        After recalculation, re-run FIFO allocation for all payments.
        """
        import datetime
        from decimal import Decimal
        from apps.billing.models import Charge, Payment, PaymentAllocation

        old_price = old_room.monthly_price
        new_price = new_room.monthly_price

        if old_price == new_price:
            return

        # Get ALL charges from current month onwards (including paid ones)
        future_charges = Charge.objects.filter(
            resident=resident,
        ).filter(
            models.Q(period_year__gt=transfer_date.year) |
            models.Q(period_year=transfer_date.year, period_month__gte=transfer_date.month)
        )

        for charge in future_charges:
            # Remove existing allocations for this charge
            PaymentAllocation.objects.filter(charge=charge).delete()
            # Update amount to new price
            charge.amount = new_price
            charge.status = Charge.Status.PENDING
            charge.save(update_fields=['amount', 'status'])

        # Re-run FIFO allocation for ALL payments of this resident
        all_charges = Charge.objects.filter(
            resident=resident,
        ).order_by('period_year', 'period_month')

        # Clear ALL allocations and reset all charge statuses
        PaymentAllocation.objects.filter(charge__resident=resident).delete()
        all_charges.update(status=Charge.Status.PENDING)

        # Re-allocate all payments in order
        all_payments = Payment.objects.filter(
            resident=resident,
            status=Payment.Status.COMPLETED,
        ).order_by('payment_date', 'created_at')

        for payment in all_payments:
            remaining = payment.amount
            pending_charges = Charge.objects.filter(
                resident=resident,
                status__in=[Charge.Status.PENDING, Charge.Status.PARTIALLY_PAID],
            ).order_by('period_year', 'period_month')

            for charge in pending_charges:
                if remaining <= 0:
                    break
                charge_remaining = charge.amount - (
                    PaymentAllocation.objects.filter(charge=charge).aggregate(
                        total=models.Sum('amount')
                    )['total'] or Decimal('0')
                )
                if charge_remaining <= 0:
                    continue

                alloc_amount = min(remaining, charge_remaining)
                PaymentAllocation.objects.create(
                    payment=payment,
                    charge=charge,
                    amount=alloc_amount,
                )
                remaining -= alloc_amount

                paid_total = PaymentAllocation.objects.filter(charge=charge).aggregate(
                    total=models.Sum('amount')
                )['total'] or Decimal('0')
                if paid_total >= charge.amount:
                    charge.status = Charge.Status.PAID
                else:
                    charge.status = Charge.Status.PARTIALLY_PAID
                charge.save(update_fields=['status'])
