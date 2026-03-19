import pytest
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role, User
from apps.inventory.models import Room
from apps.occupancy.services import RoomAssignmentService
from apps.residents.models import Resident


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def manager_client(api_client, manager_user):
    api_client.force_authenticate(user=manager_user)
    return api_client


@pytest.fixture
def security_user(db):
    role = Role.objects.get_or_create(name='security_staff')[0]
    return User.objects.create_user(
        email='security@test.com', password='testpass123',
        full_name='Security Guard', role=role,
    )


@pytest.fixture
def security_client(api_client, security_user):
    api_client.force_authenticate(user=security_user)
    return api_client


@pytest.mark.django_db
class TestResidentViewSet:

    def test_list_residents(self, security_client, resident):
        response = security_client.get('/api/v1/residents/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_retrieve_resident(self, security_client, resident):
        response = security_client.get(f'/api/v1/residents/{resident.pk}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['full_name'] == resident.full_name

    def test_create_resident(self, manager_client):
        response = manager_client.post('/api/v1/residents/', {
            'full_name': 'New Student',
            'gender': 'male',
            'university_id': 'NEW001',
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert Resident.objects.filter(university_id='NEW001').exists()

    def test_security_cannot_create(self, security_client):
        response = security_client.post('/api/v1/residents/', {
            'full_name': 'Blocked',
            'gender': 'male',
            'university_id': 'BLOCKED',
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_filter_by_status(self, security_client, resident):
        response = security_client.get('/api/v1/residents/', {'status': 'active'})
        assert response.status_code == status.HTTP_200_OK

    def test_search_by_name(self, security_client, resident):
        response = security_client.get('/api/v1/residents/', {'search': 'John'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1


@pytest.mark.django_db
class TestResidentGuardiansEndpoint:

    def test_get_guardians(self, security_client, resident):
        from apps.residents.models import Guardian
        Guardian.objects.create(resident=resident, full_name='Parent', relationship='father', phone_number='+998901234567')
        response = security_client.get(f'/api/v1/residents/{resident.pk}/guardians/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_add_guardian(self, security_client, resident):
        response = security_client.post(
            f'/api/v1/residents/{resident.pk}/guardians/',
            {'full_name': 'New Guardian', 'relationship': 'mother', 'phone_number': '+998909999999'},
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestResidentBalanceEndpoint:

    def test_get_balance(self, security_client, resident):
        response = security_client.get(f'/api/v1/residents/{resident.pk}/balance/')
        assert response.status_code == status.HTTP_200_OK
        assert 'debt' in response.data


@pytest.mark.django_db
class TestResidentTransferEndpoint:

    def test_transfer_resident(self, manager_client, resident, room, contract, manager_user, floor):
        RoomAssignmentService.assign_resident_to_room(resident, room, contract, manager_user)
        new_room = Room.objects.create(floor=floor, room_number='501', capacity=4, gender_policy='mixed')
        response = manager_client.post(
            f'/api/v1/residents/{resident.pk}/transfer/',
            {'new_room': str(new_room.pk)},
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_transfer_no_active_assignment(self, manager_client, resident):
        response = manager_client.post(
            f'/api/v1/residents/{resident.pk}/transfer/',
            {'new_room': '00000000-0000-0000-0000-000000000001'},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_transfer_missing_room(self, manager_client, resident):
        response = manager_client.post(f'/api/v1/residents/{resident.pk}/transfer/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
