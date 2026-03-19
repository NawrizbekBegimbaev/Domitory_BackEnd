from rest_framework.routers import DefaultRouter

from apps.residents.views import FacultyViewSet, GuardianViewSet, ResidentDocumentViewSet, ResidentViewSet

router = DefaultRouter()
router.register(r'residents', ResidentViewSet, basename='resident')
router.register(r'guardians', GuardianViewSet, basename='guardian')
router.register(r'documents', ResidentDocumentViewSet, basename='document')
router.register(r'faculties', FacultyViewSet, basename='faculty')

urlpatterns = router.urls
