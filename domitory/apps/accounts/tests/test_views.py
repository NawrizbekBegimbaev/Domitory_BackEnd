import pytest
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role, User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestLoginEndpoint:

    def test_login_success(self, api_client, user):
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'admin@test.com',
            'password': 'testpass123',
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_wrong_password(self, api_client, user):
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'admin@test.com',
            'password': 'wrong',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_fields(self, api_client):
        response = api_client.post('/api/v1/auth/login/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMeEndpoint:

    def test_me_authenticated(self, auth_client, user):
        response = auth_client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
        assert response.data['full_name'] == user.full_name

    def test_me_unauthenticated(self, api_client):
        response = api_client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserViewSet:

    def test_list_users(self, auth_client, user):
        response = auth_client.get('/api/v1/users/')
        assert response.status_code == status.HTTP_200_OK

    def test_create_user(self, auth_client, role_manager):
        response = auth_client.post('/api/v1/users/', {
            'email': 'newuser@test.com',
            'password': 'securepass123',
            'full_name': 'New User',
            'role': role_manager.pk,
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email='newuser@test.com').exists()

    def test_unauthenticated_denied(self, api_client):
        response = api_client.get('/api/v1/users/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
