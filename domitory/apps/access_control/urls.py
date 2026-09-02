from rest_framework.routers import DefaultRouter

from apps.access_control.views import AccessEventViewSet

router = DefaultRouter()
router.register(r'access-events', AccessEventViewSet, basename='access-event')

urlpatterns = router.urls
