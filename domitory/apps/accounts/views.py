from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.models import User, Role, PasswordResetOTP
from apps.accounts.permissions import IsUniversityAdmin
from apps.accounts.serializers import (
    LoginSerializer,
    MeSerializer,
    RoleSerializer,
    UserCreateSerializer,
    UserReadSerializer,
    UserUpdateSerializer,
)
from apps.accounts.services import AuthService
from common.tenancy import GLOBAL_ROLES, is_global_user, scope_queryset


class RoleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = Role.objects.all()
        serializer = RoleSerializer(roles, many=True)
        return Response(serializer.data)


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
        qs = User.objects.select_related('role', 'university').all()
        if is_global_user(self.request.user):
            uni = self.request.query_params.get('university')
            return qs.filter(university_id=uni) if uni else qs
        # university_admin: own university only, and never global accounts
        return qs.filter(university_id=self.request.user.university_id).exclude(role__name__in=GLOBAL_ROLES)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserReadSerializer

    def _resolve_university(self, data, current=None):
        """Decide which university a created/updated user belongs to.

        - global roles (platform_admin, ministry): no university; only platform_admin may assign them
        - platform_admin creating a scoped user: must pass university explicitly
        - university_admin: always their own university, cannot create global roles
        """
        from rest_framework.exceptions import PermissionDenied, ValidationError
        me = self.request.user
        role = data.get('role', getattr(current, 'role', None))
        role_name = role.name if role else None
        if role_name in GLOBAL_ROLES:
            if me.role_name != 'platform_admin':
                raise PermissionDenied('Только суперадмин может назначать роль ' + role_name)
            return None
        if me.role_name == 'platform_admin':
            uni = data.get('university', getattr(current, 'university', None))
            if uni is None and self.request.query_params.get('university'):
                from apps.universities.models import University
                uni = University.objects.filter(pk=self.request.query_params['university']).first()
            if uni is None:
                raise ValidationError({'university': 'Укажите университет'})
            return uni
        return me.university

    def perform_create(self, serializer):
        data = serializer.validated_data.copy()
        data['university'] = self._resolve_university(data)
        AuthService.create_user(data, created_by=self.request.user)

    def perform_update(self, serializer):
        university = self._resolve_university(serializer.validated_data, current=serializer.instance)
        serializer.save(university=university)


class VerifyEmailSendView(APIView):
    """Send OTP to email for verification during user creation."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import random
        from django.core.mail import send_mail
        from django.conf import settings

        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': {'code': 'ValidationError', 'message': 'Email required'}}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': {'code': 'Exists', 'message': 'Email already registered'}}, status=status.HTTP_400_BAD_REQUEST)

        code = str(random.randint(100000, 999999))
        # Store in session-like way using OTP model with a temp user reference
        # We'll use request user as reference since it's admin creating the account
        PasswordResetOTP.objects.create(user=request.user, code=code)

        send_mail(
            subject='Dormitory — Подтверждение email',
            message=f'Код подтверждения email: {code}\n\nКод действителен 10 минут.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return Response({'message': 'OTP sent to email', 'otp_hint': code[:1] + '****' + code[-1:]})


class VerifyEmailConfirmView(APIView):
    """Verify email OTP code."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip()
        if not code:
            return Response({'error': {'code': 'ValidationError', 'message': 'Code required'}}, status=status.HTTP_400_BAD_REQUEST)

        otp = PasswordResetOTP.objects.filter(
            user=request.user, code=code, is_used=False,
        ).order_by('-created_at').first()

        if not otp or otp.is_expired:
            return Response({'error': {'code': 'InvalidOTP', 'message': 'Invalid or expired code'}}, status=status.HTTP_400_BAD_REQUEST)

        otp.is_used = True
        otp.save(update_fields=['is_used'])
        return Response({'verified': True})


class VerifyPhoneSendView(APIView):
    """Send OTP to Telegram for phone verification."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import random
        from apps.accounts.telegram import send_telegram_otp

        phone = request.data.get('phone', '').strip()
        if not phone:
            return Response({'error': {'code': 'ValidationError', 'message': 'Phone required'}}, status=status.HTTP_400_BAD_REQUEST)

        from apps.accounts.models import TelegramLink

        # Find telegram_id from User or TelegramLink
        telegram_id = None
        linked_user = User.objects.filter(phone_number=phone, telegram_id__isnull=False).first()
        if linked_user:
            telegram_id = linked_user.telegram_id
        else:
            link = TelegramLink.objects.filter(phone_number=phone).first()
            if link:
                telegram_id = link.telegram_id

        if not telegram_id:
            from django.conf import settings
            return Response({
                'error': {
                    'code': 'TelegramNotLinked',
                    'message': f'Этот номер не привязан к Telegram. Отправьте /start боту @{settings.TELEGRAM_BOT_USERNAME}',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        code = str(random.randint(100000, 999999))
        PasswordResetOTP.objects.create(user=request.user, code=code)
        send_telegram_otp(telegram_id, code)

        return Response({'message': 'OTP sent via Telegram'})


class VerifyPhoneConfirmView(APIView):
    """Verify phone OTP code."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip()
        if not code:
            return Response({'error': {'code': 'ValidationError', 'message': 'Code required'}}, status=status.HTTP_400_BAD_REQUEST)

        otp = PasswordResetOTP.objects.filter(
            user=request.user, code=code, is_used=False,
        ).order_by('-created_at').first()

        if not otp or otp.is_expired:
            return Response({'error': {'code': 'InvalidOTP', 'message': 'Invalid or expired code'}}, status=status.HTTP_400_BAD_REQUEST)

        otp.is_used = True
        otp.save(update_fields=['is_used'])
        return Response({'verified': True})


class PhoneLoginRequestView(APIView):
    """Send OTP to Telegram by phone number."""
    permission_classes = [AllowAny]

    def post(self, request):
        import random
        from apps.accounts.telegram import send_telegram_otp

        phone = request.data.get('phone', '').strip()
        if not phone:
            return Response({'error': {'code': 'ValidationError', 'message': 'Phone required'}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(phone_number=phone)
        except User.DoesNotExist:
            return Response({'error': {'code': 'NotFound', 'message': 'Phone not found'}}, status=status.HTTP_400_BAD_REQUEST)

        # Find telegram_id from user or TelegramLink
        from apps.accounts.models import TelegramLink
        telegram_id = user.telegram_id
        if not telegram_id:
            link = TelegramLink.objects.filter(phone_number=phone).first()
            if link:
                telegram_id = link.telegram_id
                user.telegram_id = telegram_id
                user.save(update_fields=['telegram_id'])

        if not telegram_id:
            from django.conf import settings
            return Response({'error': {'code': 'TelegramNotLinked', 'message': f'Telegram not linked. Send /start to @{settings.TELEGRAM_BOT_USERNAME}'}}, status=status.HTTP_400_BAD_REQUEST)

        code = str(random.randint(100000, 999999))
        PasswordResetOTP.objects.create(user=user, code=code)
        send_telegram_otp(telegram_id, code)

        return Response({'message': 'OTP sent via Telegram'})


class PhoneLoginConfirmView(APIView):
    """Verify OTP and return JWT tokens."""
    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken

        phone = request.data.get('phone', '').strip()
        code = request.data.get('code', '').strip()

        if not phone or not code:
            return Response({'error': {'code': 'ValidationError', 'message': 'phone and code required'}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(phone_number=phone)
        except User.DoesNotExist:
            return Response({'error': {'code': 'NotFound', 'message': 'Invalid phone or code'}}, status=status.HTTP_400_BAD_REQUEST)

        otp = PasswordResetOTP.objects.filter(user=user, code=code, is_used=False).order_by('-created_at').first()
        if not otp or otp.is_expired:
            return Response({'error': {'code': 'InvalidOTP', 'message': 'Invalid or expired code'}}, status=status.HTTP_400_BAD_REQUEST)

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': str(user.id),
        })


class PasswordResetRequestView(APIView):
    """Send OTP code to email."""
    permission_classes = [AllowAny]

    def post(self, request):
        import random
        from django.core.mail import send_mail
        from django.conf import settings

        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': {'code': 'ValidationError', 'message': 'Email is required'}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists
            return Response({'message': 'If email exists, OTP was sent'})

        code = str(random.randint(100000, 999999))
        PasswordResetOTP.objects.create(user=user, code=code)

        # Send via Telegram if linked, otherwise email
        sent_via = 'email'
        if user.telegram_id:
            from apps.accounts.telegram import send_telegram_otp
            send_telegram_otp(user.telegram_id, code)
            sent_via = 'telegram'
        else:
            send_mail(
                subject='Dormitory — Сброс пароля',
                message=f'Ваш код для сброса пароля: {code}\n\nКод действителен {settings.PASSWORD_RESET_OTP_EXPIRY} минут.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )

        return Response({'message': 'OTP sent', 'via': sent_via})


class PasswordResetConfirmView(APIView):
    """Verify OTP and set new password."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()
        new_password = request.data.get('new_password', '')

        if not email or not code or not new_password:
            return Response({'error': {'code': 'ValidationError', 'message': 'email, code, new_password required'}}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': {'code': 'ValidationError', 'message': 'Password min 8 chars'}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': {'code': 'NotFound', 'message': 'Invalid email or code'}}, status=status.HTTP_400_BAD_REQUEST)

        otp = PasswordResetOTP.objects.filter(
            user=user, code=code, is_used=False,
        ).order_by('-created_at').first()

        if not otp or otp.is_expired:
            return Response({'error': {'code': 'InvalidOTP', 'message': 'Invalid or expired code'}}, status=status.HTTP_400_BAD_REQUEST)

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response({'message': 'Password reset successful'})
