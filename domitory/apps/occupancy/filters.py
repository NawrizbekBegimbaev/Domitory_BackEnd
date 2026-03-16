from django_filters import rest_framework as filters

from apps.occupancy.models import AccommodationContract, RoomAssignment


class ContractFilter(filters.FilterSet):
    building = filters.UUIDFilter(field_name='building__id')

    class Meta:
        model = AccommodationContract
        fields = {
            'status': ['exact'],
            'resident': ['exact'],
        }


class AssignmentFilter(filters.FilterSet):
    building = filters.UUIDFilter(field_name='room__floor__building__id')

    class Meta:
        model = RoomAssignment
        fields = {
            'status': ['exact'],
            'resident': ['exact'],
            'room': ['exact'],
        }
