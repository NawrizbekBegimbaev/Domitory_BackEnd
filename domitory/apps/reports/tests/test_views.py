import pytest
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role, User


@pytest.fixture
def api_client():
    return APIClient()


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


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestReportEndpoints:

    def test_summary(self, auth_client):
        response = auth_client.get('/api/v1/reports/summary/')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_residents' in response.data

    def test_occupancy(self, auth_client, building, floor, room):
        response = auth_client.get('/api/v1/reports/occupancy/')
        assert response.status_code == status.HTTP_200_OK

    def test_available_rooms(self, auth_client, room):
        response = auth_client.get('/api/v1/reports/available-rooms/')
        assert response.status_code == status.HTTP_200_OK

    def test_debtors(self, auth_client):
        response = auth_client.get('/api/v1/reports/debtors/')
        assert response.status_code == status.HTTP_200_OK

    def test_payments_report(self, auth_client):
        response = auth_client.get('/api/v1/reports/payments/')
        assert response.status_code == status.HTTP_200_OK

    def test_residents_report(self, auth_client, resident):
        response = auth_client.get('/api/v1/reports/residents/')
        assert response.status_code == status.HTTP_200_OK

    def test_unauthenticated_denied(self, api_client):
        response = api_client.get('/api/v1/reports/summary/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_security_can_access(self, security_client):
        response = security_client.get('/api/v1/reports/summary/')
        assert response.status_code == status.HTTP_200_OK
