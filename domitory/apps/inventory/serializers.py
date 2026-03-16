from rest_framework import serializers

from apps.inventory.models import Building, Floor, Room


class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = [
            'id', 'organization', 'name', 'address',
            'gender_policy', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FloorSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)

    class Meta:
        model = Floor
        fields = ['id', 'building', 'building_name', 'number', 'description']
        read_only_fields = ['id']


class RoomListSerializer(serializers.ModelSerializer):
    floor_number = serializers.IntegerField(source='floor.number', read_only=True)
    building_name = serializers.CharField(source='floor.building.name', read_only=True)
    available_beds = serializers.IntegerField(read_only=True)

    class Meta:
        model = Room
        fields = [
            'id', 'floor', 'floor_number', 'building_name',
            'room_number', 'capacity', 'current_occupancy', 'available_beds',
            'gender_policy', 'status', 'monthly_price',
        ]


class RoomDetailSerializer(serializers.ModelSerializer):
    floor_number = serializers.IntegerField(source='floor.number', read_only=True)
    building_name = serializers.CharField(source='floor.building.name', read_only=True)
    building_id = serializers.UUIDField(source='floor.building.id', read_only=True)
    available_beds = serializers.IntegerField(read_only=True)

    class Meta:
        model = Room
        fields = [
            'id', 'floor', 'floor_number', 'building_id', 'building_name',
            'room_number', 'capacity', 'current_occupancy', 'available_beds',
            'gender_policy', 'status', 'monthly_price', 'description',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'current_occupancy', 'created_at', 'updated_at']
