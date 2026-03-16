from rest_framework.routers import DefaultRouter

from apps.residents.views import GuardianViewSet, ResidentDocumentViewSet, ResidentViewSet

router = DefaultRouter()
router.register(r'residents', ResidentViewSet, basename='resident')
router.register(r'guardians', GuardianViewSet, basename='guardian')
router.register(r'documents', ResidentDocumentViewSet, basename='document')

urlpatterns = router.urls
