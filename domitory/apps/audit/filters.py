from django_filters import rest_framework as filters

from apps.audit.models import AuditLog


class AuditLogFilter(filters.FilterSet):
    date_from = filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')

    class Meta:
        model = AuditLog
        fields = {
            'action': ['exact'],
            'model_name': ['exact'],
            'user': ['exact'],
        }
