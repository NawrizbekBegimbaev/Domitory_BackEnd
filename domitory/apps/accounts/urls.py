from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.accounts.views import (
    LoginView, MeView, RefreshView, RoleListView, UserViewSet,
    PasswordResetRequestView, PasswordResetConfirmView,
    PhoneLoginRequestView, PhoneLoginConfirmView,
    VerifyEmailSendView, VerifyEmailConfirmView,
    VerifyPhoneSendView, VerifyPhoneConfirmView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/login/phone/', PhoneLoginRequestView.as_view(), name='phone-login-request'),
    path('auth/login/phone/confirm/', PhoneLoginConfirmView.as_view(), name='phone-login-confirm'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('auth/verify-email/', VerifyEmailSendView.as_view(), name='verify-email-send'),
    path('auth/verify-email/confirm/', VerifyEmailConfirmView.as_view(), name='verify-email-confirm'),
    path('auth/verify-phone/', VerifyPhoneSendView.as_view(), name='verify-phone-send'),
    path('auth/verify-phone/confirm/', VerifyPhoneConfirmView.as_view(), name='verify-phone-confirm'),
    path('roles/', RoleListView.as_view(), name='roles-list'),
    path('', include(router.urls)),
]
