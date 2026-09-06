import pytest
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role, User


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
class TestBuildingViewSet:

    def test_list_buildings(self, manager_client, building):
        response = manager_client.get('/api/v1/buildings/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_create_building(self, manager_client):
        response = manager_client.post('/api/v1/buildings/', {
            'name': 'Building B',
            'gender_policy': 'mixed',
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve_building(self, manager_client, building):
        response = manager_client.get(f'/api/v1/buildings/{building.pk}/')
        assert response.status_code == status.HTTP_200_OK

    def test_security_cannot_create(self, security_client):
        response = security_client.post('/api/v1/buildings/', {
            'name': 'Blocked', 'gender_policy': 'mixed',
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestFloorViewSet:

    def test_list_floors(self, manager_client, floor):
        response = manager_client.get('/api/v1/floors/')
        assert response.status_code == status.HTTP_200_OK

    def test_create_floor(self, manager_client, building):
        response = manager_client.post('/api/v1/floors/', {
            'building': str(building.pk), 'number': 2,
        })
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestRoomViewSet:

    def test_list_rooms(self, security_client, room):
        response = security_client.get('/api/v1/rooms/')
        assert response.status_code == status.HTTP_200_OK

    def test_available_rooms(self, security_client, room):
        response = security_client.get('/api/v1/rooms/available/')
        assert response.status_code == status.HTTP_200_OK

    def test_create_room(self, manager_client, floor):
        response = manager_client.post('/api/v1/rooms/', {
            'floor': str(floor.pk), 'room_number': '301',
            'capacity': 3, 'gender_policy': 'mixed', 'monthly_price': '500000.00',
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_security_cannot_create(self, security_client, floor):
        response = security_client.post('/api/v1/rooms/', {
            'floor': str(floor.pk), 'room_number': '999', 'capacity': 2,
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN
