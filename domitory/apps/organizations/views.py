from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsUniversityAdmin
from apps.organizations.models import Organization
from apps.organizations.serializers import OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsUniversityAdmin]
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role_name == 'platform_admin':
            return Organization.objects.all()
        return Organization.objects.filter(id=user.organization_id)
