from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.models import User
from apps.accounts.permissions import IsPlatformAdmin, IsUniversityAdmin
from apps.accounts.serializers import (
    LoginSerializer,
    MeSerializer,
    UserCreateSerializer,
    UserReadSerializer,
    UserUpdateSerializer,
)
from apps.accounts.services import AuthService


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = AuthService.login(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )
        if result is None:
            return Response(
                {'error': {'code': 'AuthenticationFailed', 'message': 'Invalid email or password', 'details': {}}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(result, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    pass


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsUniversityAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role_name == 'platform_admin':
            return User.objects.select_related('role', 'organization').all()
        return User.objects.select_related('role', 'organization').filter(
            organization=user.organization,
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserReadSerializer

    def perform_create(self, serializer):
        data = serializer.validated_data.copy()
        AuthService.create_user(data, created_by=self.request.user)
