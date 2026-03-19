from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.audit.services import AuditService


class AuthService:

    @staticmethod
    def login(email, password):
        user = authenticate(email=email, password=password)
        if user is None:
            return None
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': str(user.id),
        }

    @staticmethod
    def create_user(data, created_by=None):
        password = data.pop('password')
        user = User(**data)
        user.set_password(password)
        user.save()
        if created_by:
            AuditService.log(created_by, 'create', user, {
                'email': user.email,
                'full_name': user.full_name,
            })
        return user
