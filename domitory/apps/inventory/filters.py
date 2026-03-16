from django_filters import rest_framework as filters

from apps.inventory.models import Building, Floor, Room


class BuildingFilter(filters.FilterSet):
    class Meta:
        model = Building
        fields = {
            'is_active': ['exact'],
            'gender_policy': ['exact'],
        }


class FloorFilter(filters.FilterSet):
    class Meta:
        model = Floor
        fields = {
            'building': ['exact'],
        }


class RoomFilter(filters.FilterSet):
    building = filters.UUIDFilter(field_name='floor__building__id')
    floor_number = filters.NumberFilter(field_name='floor__number')

    class Meta:
        model = Room
        fields = {
            'status': ['exact'],
            'gender_policy': ['exact'],
        }
