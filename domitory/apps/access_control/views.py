from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsSecurityStaff
from apps.access_control.filters import AccessEventFilter
from apps.access_control.models import AccessEvent
from apps.access_control.serializers import AccessEventSerializer
from common.tenancy import UniversityScopedMixin


class AccessEventViewSet(UniversityScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = AccessEventSerializer
    filterset_class = AccessEventFilter
    search_fields = ['resident__full_name', 'device_name', 'card_number']
    ordering_fields = ['timestamp']
    university_lookup = 'resident__university'

    def get_queryset(self):
        return self.scope(AccessEvent.objects.select_related('resident').all())
