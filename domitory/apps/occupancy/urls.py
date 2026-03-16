from rest_framework.routers import DefaultRouter

from apps.occupancy.views import ContractViewSet, RoomAssignmentViewSet, StayRecordViewSet

router = DefaultRouter()
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'assignments', RoomAssignmentViewSet, basename='assignment')
router.register(r'stay-records', StayRecordViewSet, basename='stay-record')

urlpatterns = router.urls
