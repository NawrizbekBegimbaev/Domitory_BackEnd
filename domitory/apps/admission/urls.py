from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.admission.views import (
    AdmissionStatusView,
    BookingViewSet,
    BookingWindowViewSet,
    BuildingOrderViewSet,
    CampaignViewSet,
    EligibilityView,
    EligibleRoomsView,
    PlacementRuleViewSet,
)

router = DefaultRouter()
router.register(r'admission/campaigns', CampaignViewSet, basename='admission-campaign')
router.register(r'admission/windows', BookingWindowViewSet, basename='admission-window')
router.register(r'admission/rules', PlacementRuleViewSet, basename='admission-rule')
router.register(r'admission/building-order', BuildingOrderViewSet, basename='admission-building-order')
router.register(r'admission/bookings', BookingViewSet, basename='admission-booking')

urlpatterns = [
    path('admission/eligibility/', EligibilityView.as_view(), name='admission-eligibility'),
    path('admission/eligible-rooms/', EligibleRoomsView.as_view(), name='admission-eligible-rooms'),
    path('admission/status/', AdmissionStatusView.as_view(), name='admission-status'),
] + router.urls
