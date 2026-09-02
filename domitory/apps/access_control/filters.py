from django_filters import rest_framework as filters

from apps.access_control.models import AccessEvent


class AccessEventFilter(filters.FilterSet):
    date_from = filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')

    class Meta:
        model = AccessEvent
        fields = {
            'resident': ['exact'],
            'direction': ['exact'],
            'device_name': ['exact'],
        }
