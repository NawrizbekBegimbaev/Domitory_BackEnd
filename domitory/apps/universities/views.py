from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsPlatformAdmin
from apps.universities.models import University
from apps.universities.serializers import UniversitySerializer
from common.tenancy import is_global_user


class UniversityViewSet(viewsets.ModelViewSet):
    """Universities (tenants). Read: any authenticated user (scoped users see only their own).
    Write: platform_admin only."""
    permission_classes = [IsAuthenticated]
    serializer_class = UniversitySerializer
    search_fields = ['name', 'short_name', 'city']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        qs = University.objects.all()
        user = self.request.user
        if is_global_user(user):
            return qs
        return qs.filter(id=user.university_id)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsPlatformAdmin()]
        return super().get_permissions()
