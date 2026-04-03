from django.db.models import Q
from django_filters import rest_framework as filters

from apps.residents.models import Resident


class ResidentFilter(filters.FilterSet):
    available = filters.BooleanFilter(method='filter_available')

    class Meta:
        model = Resident
        fields = {
            'status': ['exact', 'in'],
            'gender': ['exact'],
            'faculty': ['exact'],
            'course': ['exact'],
        }

    def filter_available(self, queryset, name, value):
        """Filter residents available for room assignment (no active assignment)."""
        if value:
            return queryset.exclude(
                room_assignments__status='active',
            ).filter(
                status__in=['pending', 'evicted'],
            )
        return queryset
