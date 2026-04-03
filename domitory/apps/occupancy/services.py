import calendar
import datetime
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.billing.models import Charge, PaymentAllocation
from apps.billing.services import ChargeService, FIFOAllocator
from apps.inventory.models import Room
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

        # Pro-rata refund
        ContractService._refund_on_termination(contract, user)

        # Update resident status
        contract.resident.status = Resident.Status.EVICTED
        contract.resident.save(update_fields=['status'])

        if user:
            AuditService.log(user, 'update', contract, {'status': {'old': old_status, 'new': 'terminated'}})
        return contract

    @staticmethod
    def _refund_on_termination(contract, user=None):
        """Cancel future charges and prorate current month.

        1. Prorate current month charge to actual days lived
        2. Cancel all charges for months AFTER current month
        3. Re-run FIFO allocation
        """
        today = timezone.now().date()
        resident = contract.resident

        # 1. Prorate current month
        current_charges = Charge.objects.filter(
            resident=resident,
            period_month=today.month,
            period_year=today.year,
        ).exclude(status=Charge.Status.CANCELLED)

        for charge in current_charges:
            s_day = charge.start_day or 1
            # Only prorate if charge covers days after today
            if charge.end_day and charge.end_day > today.day and s_day <= today.day:
                room = charge.room
                if room:
                    new_amount = Charge.calculate_prorated_amount(
                        room.monthly_price, today.year, today.month, s_day, today.day
                    )
                else:
                    # Fallback: proportional based on current amount
                    days_in_month = calendar.monthrange(today.year, today.month)[1]
                    old_days = (charge.end_day or days_in_month) - s_day + 1
                    new_days = today.day - s_day + 1
                    new_amount = (charge.amount * Decimal(str(new_days)) / Decimal(str(old_days))).quantize(Decimal('0.01'))

                PaymentAllocation.objects.filter(charge=charge).delete()
                charge.end_day = today.day
                charge.days_charged = today.day - s_day + 1
                charge.amount = new_amount
                charge.is_prorated = True
                charge.status = Charge.Status.PENDING
                charge.save(update_fields=['end_day', 'days_charged', 'amount', 'is_prorated', 'status'])
            elif s_day > today.day:
                # Charge starts after today — cancel entirely
                PaymentAllocation.objects.filter(charge=charge).delete()
                charge.status = Charge.Status.CANCELLED
                charge.save(update_fields=['status'])

        # 2. Cancel future months
        future_charges = Charge.objects.filter(
            resident=resident,
        ).exclude(
            status=Charge.Status.CANCELLED,
        ).filter(
            models.Q(period_year__gt=today.year) |
            models.Q(period_year=today.year, period_month__gt=today.month)
        )

        for charge in future_charges:
            PaymentAllocation.objects.filter(charge=charge).delete()
            charge.status = Charge.Status.CANCELLED
            charge.save(update_fields=['status'])

        # 3. Re-run FIFO
        FIFOAllocator.reallocate_all_payments(resident)


class RoomAssignmentService:

    @staticmethod
    def _effective_price(room, beds):
        """Calculate monthly price for a resident based on beds purchased.

        monthly_price is the price per ONE bed per month.
        Total room cost = monthly_price × capacity.
        """
        return room.monthly_price * beds

    @staticmethod
    @transaction.atomic
    def assign_resident_to_room(resident, room, contract, assigned_by, beds_purchased=1):
        if RoomAssignment.objects.filter(
            resident=resident, status=RoomAssignment.Status.ACTIVE,
        ).exists():
            raise ValidationError('Resident already has an active room assignment.')

        if contract.status != AccommodationContract.Status.ACTIVE:
            raise ValidationError('Contract is not active.')

        if room.current_occupancy + beds_purchased > room.capacity:
            raise ValidationError(f'Not enough beds. Available: {room.capacity - room.current_occupancy}, requested: {beds_purchased}')

        RoomService.validate_gender_policy(room, resident)

        assignment = RoomAssignment.objects.create(
            contract=contract,
            resident=resident,
            room=room,
            beds_purchased=beds_purchased,
            start_date=timezone.now().date(),
            assigned_by=assigned_by,
        )

        # Increment occupancy by beds_purchased (not just 1)
        room.current_occupancy += beds_purchased
        if room.current_occupancy >= room.capacity:
            room.status = Room.Status.FULL
        room.save(update_fields=['current_occupancy', 'status'])

        StayRecord.objects.create(
            resident=resident,
            check_in_at=timezone.now(),
            reason=StayRecord.Reason.INITIAL_CHECK_IN,
            recorded_by=assigned_by,
        )

        if resident.status != Resident.Status.ACTIVE:
            resident.status = Resident.Status.ACTIVE
            resident.save(update_fields=['status'])

        # Generate charges: monthly_price × beds_purchased
        effective_price = RoomAssignmentService._effective_price(room, beds_purchased)
        ChargeService.generate_charges_for_assignment(
            contract, room, price_override=effective_price
        )

        FIFOAllocator.reallocate_all_payments(resident)

        AuditService.log(assigned_by, 'create', assignment, {
            'resident': str(resident),
            'room': str(room.room_number),
            'beds_purchased': beds_purchased,
        })

        return assignment

    @staticmethod
    @transaction.atomic
    def assign_full_room(residents_and_contracts, room, assigned_by):
        """Assign entire room to a group of residents. Cost split evenly.

        residents_and_contracts: list of (resident, contract) tuples
        Total cost = monthly_price × capacity, split among residents.
        """
        from apps.inventory.models import Room

        num_residents = len(residents_and_contracts)
        if num_residents == 0:
            raise ValidationError('No residents provided.')
        if num_residents > room.capacity:
            raise ValidationError(f'Too many residents ({num_residents}) for room capacity ({room.capacity}).')
        if room.current_occupancy > 0:
            raise ValidationError('Room must be empty for full room purchase.')

        beds_each = room.capacity // num_residents
        remainder = room.capacity % num_residents

        # Total room cost split evenly among residents
        total_room_price = room.monthly_price * room.capacity
        price_per_resident = (total_room_price / Decimal(str(num_residents))).quantize(
            Decimal('0.01')
        )

        assignments = []
        for i, (resident, contract) in enumerate(residents_and_contracts):
            if RoomAssignment.objects.filter(
                resident=resident, status=RoomAssignment.Status.ACTIVE,
            ).exists():
                raise ValidationError(f'{resident.full_name} already has an active assignment.')
            if contract.status != AccommodationContract.Status.ACTIVE:
                raise ValidationError(f'Contract for {resident.full_name} is not active.')
            RoomService.validate_gender_policy(room, resident)

            # Distribute beds for occupancy tracking
            beds = beds_each + (1 if i < remainder else 0)

            assignment = RoomAssignment.objects.create(
                contract=contract,
                resident=resident,
                room=room,
                beds_purchased=beds,
                start_date=timezone.now().date(),
                assigned_by=assigned_by,
            )

            StayRecord.objects.create(
                resident=resident,
                check_in_at=timezone.now(),
                reason=StayRecord.Reason.INITIAL_CHECK_IN,
                recorded_by=assigned_by,
            )

            if resident.status != Resident.Status.ACTIVE:
                resident.status = Resident.Status.ACTIVE
                resident.save(update_fields=['status'])

            # Each resident pays equal share of total room cost
            ChargeService.generate_charges_for_assignment(
                contract, room, price_override=price_per_resident
            )
            FIFOAllocator.reallocate_all_payments(resident)

            AuditService.log(assigned_by, 'create', assignment, {
                'resident': str(resident),
                'room': str(room.room_number),
                'beds_purchased': beds,
                'full_room_purchase': True,
            })

            assignments.append(assignment)

        # Mark room as full
        room.current_occupancy = room.capacity
        room.status = Room.Status.FULL
        room.save(update_fields=['current_occupancy', 'status'])

        return assignments

    @staticmethod
    @transaction.atomic
    def evict_resident(assignment, user=None):
        now = timezone.now()
        room = assignment.room
        beds_freed = assignment.beds_purchased

        assignment.end_date = now.date()
        assignment.status = RoomAssignment.Status.COMPLETED
        assignment.save(update_fields=['end_date', 'status'])

        # Decrement occupancy by beds_purchased
        room.current_occupancy = max(0, room.current_occupancy - beds_freed)
        if room.current_occupancy < room.capacity:
            room.status = Room.Status.AVAILABLE
        room.save(update_fields=['current_occupancy', 'status'])

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

        # If was full-room purchase, reset remaining residents to 1 bed each
        # and recalculate their charges
        remaining = RoomAssignment.objects.filter(
            room=room, status=RoomAssignment.Status.ACTIVE,
        ).select_related('resident', 'contract')

        for ra in remaining:
            if ra.beds_purchased > 1:
                ra.beds_purchased = 1
                ra.save(update_fields=['beds_purchased'])
                # Recalculate charges: now pays for 1 bed only
                RoomAssignmentService._recalculate_resident_charges(
                    ra.resident, room, ra.contract, 1
                )

        if user:
            AuditService.log(user, 'update', assignment, {
                'action': 'eviction',
                'resident': str(resident),
                'beds_freed': beds_freed,
            })

        return assignment

    @staticmethod
    def _recalculate_resident_charges(resident, room, contract, beds):
        """Recalculate future charges for a resident based on new beds count."""
        today = timezone.now().date()
        effective_price = RoomAssignmentService._effective_price(room, beds)

        # Update current and future month charges
        charges = Charge.objects.filter(
            resident=resident,
            room=room,
        ).exclude(status=Charge.Status.CANCELLED).filter(
            models.Q(period_year__gt=today.year) |
            models.Q(period_year=today.year, period_month__gte=today.month)
        )

        for charge in charges:
            s_day = charge.start_day or 1
            e_day = charge.end_day or calendar.monthrange(charge.period_year, charge.period_month)[1]
            new_amount = Charge.calculate_prorated_amount(
                effective_price, charge.period_year, charge.period_month, s_day, e_day
            )
            PaymentAllocation.objects.filter(charge=charge).delete()
            charge.amount = new_amount
            charge.status = Charge.Status.PENDING
            charge.save(update_fields=['amount', 'status'])

        FIFOAllocator.reallocate_all_payments(resident)

    @staticmethod
    @transaction.atomic
    def transfer_resident(assignment, new_room, user=None):
        now = timezone.now()
        today = now.date()
        resident = assignment.resident
        old_room = assignment.room
        contract = assignment.contract
        beds_freed = assignment.beds_purchased

        RoomService.validate_capacity(new_room)
        RoomService.validate_gender_policy(new_room, resident)

        # Close old assignment
        assignment.end_date = today
        assignment.status = RoomAssignment.Status.TRANSFERRED
        assignment.save(update_fields=['end_date', 'status'])

        # Free beds in old room
        old_room.current_occupancy = max(0, old_room.current_occupancy - beds_freed)
        if old_room.current_occupancy < old_room.capacity:
            old_room.status = Room.Status.AVAILABLE
        old_room.save(update_fields=['current_occupancy', 'status'])

        # Create new assignment with 1 bed in new room
        new_assignment = RoomAssignment.objects.create(
            contract=contract,
            resident=resident,
            room=new_room,
            beds_purchased=1,
            start_date=today,
            assigned_by=user,
        )
        RoomService.increment_occupancy(new_room)

        StayRecord.objects.create(
            resident=resident,
            check_in_at=now,
            reason=StayRecord.Reason.TRANSFER,
            recorded_by=user,
        )

        # If was full-room purchase, reset remaining residents to 1 bed each
        remaining = RoomAssignment.objects.filter(
            room=old_room, status=RoomAssignment.Status.ACTIVE,
        ).select_related('resident', 'contract')

        for ra in remaining:
            if ra.beds_purchased > 1:
                old_beds = ra.beds_purchased
                ra.beds_purchased = 1
                ra.save(update_fields=['beds_purchased'])
                # Fix occupancy: free the extra beds
                old_room.current_occupancy = max(0, old_room.current_occupancy - (old_beds - 1))
                old_room.save(update_fields=['current_occupancy'])
                # Recalculate charges: now pays for 1 bed only
                RoomAssignmentService._recalculate_resident_charges(
                    ra.resident, old_room, ra.contract, 1
                )

        # Pro-rata recalculation for transferred resident
        RoomAssignmentService._recalculate_charges_on_transfer(
            resident, old_room, new_room, today, contract,
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
        """Split current month between old and new room, update future months.

        1. Current month old room: prorate to days lived (day 1..transfer_date-1)
        2. Current month new room: prorate remaining days (transfer_date..end_of_month)
        3. Future months: cancel old, create new at new_room price
        4. Re-run FIFO
        """
        month = transfer_date.month
        year = transfer_date.year
        days_in_month = calendar.monthrange(year, month)[1]

        # --- Current month: old room ---
        old_charge = Charge.objects.filter(
            resident=resident,
            period_month=month,
            period_year=year,
            room=old_room,
        ).exclude(status=Charge.Status.CANCELLED).first()

        # Also check charges without room (backward compat)
        if not old_charge:
            old_charge = Charge.objects.filter(
                resident=resident,
                period_month=month,
                period_year=year,
                room__isnull=True,
            ).exclude(status=Charge.Status.CANCELLED).first()

        if old_charge:
            s_day = old_charge.start_day or 1
            if transfer_date.day <= s_day:
                # Transfer on same day or before charge starts — cancel old entirely
                PaymentAllocation.objects.filter(charge=old_charge).delete()
                old_charge.status = Charge.Status.CANCELLED
                old_charge.save(update_fields=['status'])
            else:
                # Prorate old room to days actually lived
                old_end_day = transfer_date.day - 1
                old_amount = Charge.calculate_prorated_amount(
                    old_room.monthly_price, year, month, s_day, old_end_day
                )
                PaymentAllocation.objects.filter(charge=old_charge).delete()
                old_charge.room = old_room
                old_charge.end_day = old_end_day
                old_charge.days_charged = old_end_day - s_day + 1
                old_charge.amount = old_amount
                old_charge.is_prorated = True
                old_charge.status = Charge.Status.PENDING
                old_charge.save(update_fields=[
                    'room', 'end_day', 'days_charged', 'amount', 'is_prorated', 'status',
                ])

        # --- Current month: new room ---
        new_s_day = transfer_date.day
        new_e_day = days_in_month
        new_amount = Charge.calculate_prorated_amount(
            new_room.monthly_price, year, month, new_s_day, new_e_day
        )

        new_charge, created = Charge.objects.get_or_create(
            resident=resident,
            period_month=month,
            period_year=year,
            room=new_room,
            defaults={
                'amount': new_amount,
                'start_day': new_s_day,
                'end_day': new_e_day,
                'days_charged': new_e_day - new_s_day + 1,
                'is_prorated': True,
                'due_date': datetime.date(year, month, min(25, days_in_month)),
                'status': Charge.Status.PENDING,
            },
        )
        if not created:
            PaymentAllocation.objects.filter(charge=new_charge).delete()
            new_charge.amount = new_amount
            new_charge.start_day = new_s_day
            new_charge.end_day = new_e_day
            new_charge.days_charged = new_e_day - new_s_day + 1
            new_charge.is_prorated = True
            new_charge.status = Charge.Status.PENDING
            new_charge.save(update_fields=[
                'amount', 'start_day', 'end_day', 'days_charged', 'is_prorated', 'status',
            ])

        # --- Future months: cancel old room charges, create new ---
        future_old = Charge.objects.filter(
            resident=resident,
        ).exclude(status=Charge.Status.CANCELLED).filter(
            models.Q(period_year__gt=year) |
            models.Q(period_year=year, period_month__gt=month)
        )
        for ch in future_old:
            PaymentAllocation.objects.filter(charge=ch).delete()
            ch.status = Charge.Status.CANCELLED
            ch.save(update_fields=['status'])

        # Generate new charges from next month to contract end
        if contract.end_date:
            next_month_start = datetime.date(year, month, 1)
            if month == 12:
                next_month_start = datetime.date(year + 1, 1, 1)
            else:
                next_month_start = datetime.date(year, month + 1, 1)

            if next_month_start <= contract.end_date:
                ChargeService.generate_charges_for_assignment(
                    contract, new_room, start_date_override=next_month_start
                )

        # --- Re-run FIFO ---
        FIFOAllocator.reallocate_all_payments(resident)
