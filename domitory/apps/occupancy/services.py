from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.audit.services import AuditService
from apps.inventory.services import RoomService
from apps.occupancy.models import AccommodationContract, RoomAssignment, StayRecord
from apps.residents.models import Resident


class ContractService:

    @staticmethod
    def terminate_contract(contract, user=None):
        contract.status = AccommodationContract.Status.TERMINATED
        contract.save(update_fields=['status'])
        if user:
            AuditService.log(user, 'update', contract, {'status': {'old': 'active', 'new': 'terminated'}})
        return contract


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

        AuditService.log(assigned_by, 'create', assignment, {
            'resident': str(resident),
            'room': str(room.room_number),
        })

        return assignment

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

        if user:
            AuditService.log(user, 'create', new_assignment, {
                'action': 'transfer',
                'from_room': str(old_room.room_number),
                'to_room': str(new_room.room_number),
            })

        return new_assignment
