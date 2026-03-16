import pytest
from django.core.exceptions import ValidationError

from apps.inventory.models import Room
from apps.occupancy.models import AccommodationContract, RoomAssignment, StayRecord
from apps.occupancy.services import ContractService, RoomAssignmentService
from apps.residents.models import Resident
from apps.audit.models import AuditLog


@pytest.mark.django_db
class TestContractService:

    def test_terminate_contract(self, contract, user):
        result = ContractService.terminate_contract(contract, user)
        assert result.status == AccommodationContract.Status.TERMINATED
        assert AuditLog.objects.filter(model_name='AccommodationContract').exists()

    def test_terminate_contract_without_user(self, contract):
        result = ContractService.terminate_contract(contract)
        assert result.status == AccommodationContract.Status.TERMINATED
        assert not AuditLog.objects.filter(model_name='AccommodationContract').exists()


@pytest.mark.django_db
class TestAssignResidentToRoom:

    def test_successful_assignment(self, resident, room, contract, user):
        assignment = RoomAssignmentService.assign_resident_to_room(
            resident, room, contract, user,
        )
        assert assignment.pk is not None
        assert assignment.status == RoomAssignment.Status.ACTIVE
        assert assignment.resident == resident
        assert assignment.room == room

        room.refresh_from_db()
        assert room.current_occupancy == 1

        assert StayRecord.objects.filter(
            resident=resident,
            reason=StayRecord.Reason.INITIAL_CHECK_IN,
        ).exists()

        assert AuditLog.objects.filter(
            action='create',
            model_name='RoomAssignment',
        ).exists()

    def test_rejects_duplicate_active_assignment(self, resident, room, contract, user):
        RoomAssignmentService.assign_resident_to_room(
            resident, room, contract, user,
        )
        with pytest.raises(ValidationError, match='already has an active'):
            RoomAssignmentService.assign_resident_to_room(
                resident, room, contract, user,
            )

    def test_rejects_inactive_contract(self, resident, room, contract, user):
        contract.status = AccommodationContract.Status.TERMINATED
        contract.save()
        with pytest.raises(ValidationError, match='not active'):
            RoomAssignmentService.assign_resident_to_room(
                resident, room, contract, user,
            )

    def test_rejects_full_room(self, resident, room, contract, user):
        room.current_occupancy = room.capacity
        room.save()
        with pytest.raises(ValidationError, match='is full'):
            RoomAssignmentService.assign_resident_to_room(
                resident, room, contract, user,
            )

    def test_rejects_gender_mismatch(self, female_resident, room_male_only, building, user):
        contract = AccommodationContract.objects.create(
            resident=female_resident,
            building=building,
            contract_number='C-FEM',
            start_date='2025-01-01',
            end_date='2025-12-31',
            created_by=user,
        )
        with pytest.raises(ValidationError, match='male only'):
            RoomAssignmentService.assign_resident_to_room(
                female_resident, room_male_only, contract, user,
            )


@pytest.mark.django_db
class TestEvictResident:

    def test_eviction(self, resident, room, contract, user):
        assignment = RoomAssignmentService.assign_resident_to_room(
            resident, room, contract, user,
        )
        room.refresh_from_db()
        assert room.current_occupancy == 1

        result = RoomAssignmentService.evict_resident(assignment, user)

        assert result.status == RoomAssignment.Status.COMPLETED
        assert result.end_date is not None

        room.refresh_from_db()
        assert room.current_occupancy == 0

        resident.refresh_from_db()
        assert resident.status == Resident.Status.EVICTED

        contract.refresh_from_db()
        assert contract.status == AccommodationContract.Status.TERMINATED

        assert StayRecord.objects.filter(
            resident=resident,
            reason=StayRecord.Reason.EVICTION,
        ).exists()


@pytest.mark.django_db
class TestTransferResident:

    def test_transfer(self, resident, room, contract, user, floor):
        assignment = RoomAssignmentService.assign_resident_to_room(
            resident, room, contract, user,
        )
        new_room = Room.objects.create(
            floor=floor,
            room_number='201',
            capacity=4,
            gender_policy='mixed',
        )

        new_assignment = RoomAssignmentService.transfer_resident(
            assignment, new_room, user,
        )

        assert new_assignment.room == new_room
        assert new_assignment.status == RoomAssignment.Status.ACTIVE

        assignment.refresh_from_db()
        assert assignment.status == RoomAssignment.Status.TRANSFERRED

        room.refresh_from_db()
        assert room.current_occupancy == 0

        new_room.refresh_from_db()
        assert new_room.current_occupancy == 1

        assert StayRecord.objects.filter(
            resident=resident,
            reason=StayRecord.Reason.TRANSFER,
        ).exists()

    def test_transfer_rejects_full_room(self, resident, room, contract, user, floor):
        assignment = RoomAssignmentService.assign_resident_to_room(
            resident, room, contract, user,
        )
        full_room = Room.objects.create(
            floor=floor,
            room_number='202',
            capacity=1,
            current_occupancy=1,
            gender_policy='mixed',
        )
        with pytest.raises(ValidationError, match='is full'):
            RoomAssignmentService.transfer_resident(assignment, full_room, user)

    def test_transfer_rejects_gender_mismatch(self, female_resident, room, building, user, floor, organization):
        contract = AccommodationContract.objects.create(
            resident=female_resident,
            building=building,
            contract_number='C-FEM2',
            start_date='2025-01-01',
            end_date='2025-12-31',
            created_by=user,
        )
        assignment = RoomAssignmentService.assign_resident_to_room(
            female_resident, room, contract, user,
        )
        male_room = Room.objects.create(
            floor=floor,
            room_number='203',
            capacity=4,
            gender_policy='male_only',
        )
        with pytest.raises(ValidationError, match='male only'):
            RoomAssignmentService.transfer_resident(assignment, male_room, user)
