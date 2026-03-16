from django_filters import rest_framework as filters

from apps.residents.models import Resident


class ResidentFilter(filters.FilterSet):
    class Meta:
        model = Resident
        fields = {
            'status': ['exact'],
            'gender': ['exact'],
            'faculty': ['exact'],
            'course': ['exact'],
        }
