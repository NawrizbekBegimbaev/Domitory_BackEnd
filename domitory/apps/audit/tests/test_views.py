import pytest
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role, User
from apps.audit.services import AuditService


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
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
class TestAuditLogViewSet:

    def test_list_audit_logs(self, auth_client, user, building):
        AuditService.log(user, 'create', building, {'name': 'test'})
        response = auth_client.get('/api/v1/audit/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_filter_by_action(self, auth_client, user, building):
        AuditService.log(user, 'create', building)
        AuditService.log(user, 'update', building)
        response = auth_client.get('/api/v1/audit/', {'action': 'create'})
        assert response.status_code == status.HTTP_200_OK

    def test_security_cannot_access(self, security_client):
        response = security_client.get('/api/v1/audit/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_readonly(self, auth_client, user, building):
        log = AuditService.log(user, 'create', building)
        response = auth_client.delete(f'/api/v1/audit/{log.pk}/')
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
