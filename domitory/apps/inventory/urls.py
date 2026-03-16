from rest_framework.routers import DefaultRouter

from apps.inventory.views import BuildingViewSet, FloorViewSet, RoomViewSet

router = DefaultRouter()
router.register(r'buildings', BuildingViewSet, basename='building')
router.register(r'floors', FloorViewSet, basename='floor')
router.register(r'rooms', RoomViewSet, basename='room')

urlpatterns = router.urls
