from rest_framework import serializers

from apps.occupancy.models import AccommodationContract, RoomAssignment, StayRecord


class ContractListSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)

    class Meta:
        model = AccommodationContract
        fields = [
            'id', 'resident', 'resident_name', 'building', 'building_name',
            'contract_number', 'start_date', 'end_date', 'status',
        ]


class ContractDetailSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    assignments = serializers.SerializerMethodField()

    class Meta:
        model = AccommodationContract
        fields = [
            'id', 'resident', 'resident_name', 'building', 'building_name',
            'contract_number', 'start_date', 'end_date', 'status',
            'created_by', 'assignments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_assignments(self, obj):
        qs = obj.assignments.select_related('room', 'room__floor')
        return RoomAssignmentListSerializer(qs, many=True).data


class ContractCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationContract
        fields = [
            'id', 'resident', 'building', 'contract_number',
            'start_date', 'end_date',
        ]
        read_only_fields = ['id']


class RoomAssignmentListSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    building_name = serializers.CharField(source='room.floor.building.name', read_only=True)

    class Meta:
        model = RoomAssignment
        fields = [
            'id', 'contract', 'resident', 'resident_name',
            'room', 'room_number', 'building_name',
            'start_date', 'end_date', 'status',
        ]


class RoomAssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomAssignment
        fields = ['id', 'contract', 'resident', 'room']
        read_only_fields = ['id']


class TransferSerializer(serializers.Serializer):
    new_room = serializers.UUIDField()


class StayRecordSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)

    class Meta:
        model = StayRecord
        fields = [
            'id', 'resident', 'resident_name',
            'check_in_at', 'check_out_at', 'reason',
            'recorded_by', 'created_at',
        ]
        read_only_fields = ['id', 'recorded_by', 'created_at']
