from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsUniversityAdmin
from apps.audit.filters import AuditLogFilter
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsUniversityAdmin]
    serializer_class = AuditLogSerializer
    filterset_class = AuditLogFilter
    search_fields = ['model_name', 'object_id']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        return AuditLog.objects.select_related('user').all()
