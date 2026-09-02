from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsSecurityStaff
from apps.access_control.filters import AccessEventFilter
from apps.access_control.models import AccessEvent
from apps.access_control.serializers import AccessEventSerializer


class AccessEventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = AccessEventSerializer
    filterset_class = AccessEventFilter
    search_fields = ['resident__full_name', 'device_name', 'card_number']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        return AccessEvent.objects.select_related('resident').all()
