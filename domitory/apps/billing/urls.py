from rest_framework.routers import DefaultRouter

from apps.billing.views import ChargeViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'charges', ChargeViewSet, basename='charge')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = router.urls
