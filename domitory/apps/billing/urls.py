from rest_framework.routers import DefaultRouter

from apps.billing.views import ChargeViewSet, DiscountViewSet, PaymentViewSet, TariffPlanViewSet

router = DefaultRouter()
router.register(r'tariffs', TariffPlanViewSet, basename='tariff')
router.register(r'charges', ChargeViewSet, basename='charge')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'discounts', DiscountViewSet, basename='discount')

urlpatterns = router.urls
