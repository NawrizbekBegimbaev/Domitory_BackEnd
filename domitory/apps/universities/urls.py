from rest_framework.routers import DefaultRouter

from apps.universities.views import UniversityViewSet

router = DefaultRouter()
router.register(r'universities', UniversityViewSet, basename='university')

urlpatterns = router.urls
