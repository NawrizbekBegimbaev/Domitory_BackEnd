import pytest

from apps.accounts.models import User
from apps.accounts.services import AuthService


@pytest.mark.django_db
class TestAuthServiceLogin:

    def test_login_success(self, user):
        result = AuthService.login('admin@test.com', 'testpass123')
        assert result is not None
        assert 'access' in result
        assert 'refresh' in result
        assert result['user_id'] == str(user.id)

    def test_login_wrong_password(self, user):
        result = AuthService.login('admin@test.com', 'wrongpass')
        assert result is None

    def test_login_nonexistent_user(self, db):
        result = AuthService.login('nobody@test.com', 'testpass123')
        assert result is None

    def test_login_inactive_user(self, organization, role_admin):
        user = User.objects.create_user(
            email='inactive@test.com',
            password='testpass123',
            full_name='Inactive User',
            role=role_admin,
            organization=organization,
            is_active=False,
        )
        result = AuthService.login('inactive@test.com', 'testpass123')
        assert result is None


@pytest.mark.django_db
class TestAuthServiceCreateUser:

    def test_create_user(self, organization, role_admin):
        data = {
            'email': 'new@test.com',
            'password': 'newpass123',
            'full_name': 'New User',
            'role': role_admin,
            'organization': organization,
        }
        user = AuthService.create_user(data)
        assert user.pk is not None
        assert user.email == 'new@test.com'
        assert user.full_name == 'New User'
        assert user.check_password('newpass123')
        assert not user.check_password('wrongpass')

    def test_create_user_password_is_hashed(self, organization, role_admin):
        data = {
            'email': 'hash@test.com',
            'password': 'plain123',
            'full_name': 'Hash Test',
            'role': role_admin,
            'organization': organization,
        }
        user = AuthService.create_user(data)
        assert user.password != 'plain123'
