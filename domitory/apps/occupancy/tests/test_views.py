import pytest
from datetime import date, timedelta
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role, User
from apps.inventory.models import Room
from apps.occupancy.services import RoomAssignmentService


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def manager_client(api_client, manager_user):
    api_client.force_authenticate(user=manager_user)
    return api_client


@pytest.fixture
def security_user(db, university):
    role = Role.objects.get_or_create(name='security_staff')[0]
    return User.objects.create_user(
        email='security@test.com', password='testpass123',
        full_name='Security Guard', role=role, university=university,
    )


@pytest.fixture
def security_client(api_client, security_user):
    api_client.force_authenticate(user=security_user)
    return api_client


@pytest.mark.django_db
class TestContractViewSet:

    def test_list_contracts(self, security_client, contract):
        response = security_client.get('/api/v1/contracts/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_create_contract(self, manager_client, resident, building):
        response = manager_client.post('/api/v1/contracts/', {
            'resident': str(resident.pk),
            'building': str(building.pk),
            'contract_number': 'C-NEW-001',
            'start_date': str(date.today()),
            'end_date': str(date.today() + timedelta(days=365)),
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_terminate_contract(self, manager_client, contract):
        response = manager_client.post(f'/api/v1/contracts/{contract.pk}/terminate/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'terminated'

    def test_security_cannot_terminate(self, security_client, contract):
        response = security_client.post(f'/api/v1/contracts/{contract.pk}/terminate/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestRoomAssignmentViewSet:

    def test_create_assignment(self, manager_client, resident, room, contract):
        response = manager_client.post('/api/v1/assignments/', {
            'contract': str(contract.pk),
            'resident': str(resident.pk),
            'room': str(room.pk),
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_close_assignment(self, manager_client, resident, room, contract, manager_user):
        assignment = RoomAssignmentService.assign_resident_to_room(resident, room, contract, manager_user)
        response = manager_client.post(f'/api/v1/assignments/{assignment.pk}/close/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'completed'

    def test_transfer_assignment(self, manager_client, resident, room, contract, manager_user, floor):
        assignment = RoomAssignmentService.assign_resident_to_room(resident, room, contract, manager_user)
        new_room = Room.objects.create(floor=floor, room_number='301', capacity=4, gender_policy='mixed')
        response = manager_client.post(
            f'/api/v1/assignments/{assignment.pk}/transfer/',
            {'new_room': str(new_room.pk)},
        )
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestStayRecordViewSet:

    def test_list_stay_records(self, security_client, resident, room, contract, manager_user):
        RoomAssignmentService.assign_resident_to_room(resident, room, contract, manager_user)
        response = security_client.get('/api/v1/stay-records/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1
