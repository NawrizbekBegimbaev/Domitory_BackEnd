from rest_framework import serializers

from apps.admission.models import AdmissionCampaign, Booking, BookingWindow, BuildingOrder, PlacementRule


class CampaignSerializer(serializers.ModelSerializer):
    windows_count = serializers.IntegerField(source='windows.count', read_only=True)
    rules_count = serializers.IntegerField(source='rules.count', read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)

    class Meta:
        model = AdmissionCampaign
        fields = [
            'id', 'university', 'university_name', 'name', 'academic_year',
            'start_date', 'end_date', 'is_active', 'enforce',
            'buildings_sequential', 'floors_sequential', 'hold_hours',
            'windows_count', 'rules_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'university', 'is_active', 'created_at', 'updated_at']

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and end <= start:
            raise serializers.ValidationError({'end_date': 'Окончание должно быть позже начала.'})
        return attrs


class _CriteriaValidation:
    def validate_courses(self, value):
        try:
            return sorted({int(c) for c in value})
        except (TypeError, ValueError):
            raise serializers.ValidationError('Курсы должны быть числами.')

    def validate_faculties(self, value):
        return [str(f).strip() for f in value if str(f).strip()]


class BookingWindowSerializer(_CriteriaValidation, serializers.ModelSerializer):
    criteria_display = serializers.CharField(read_only=True)

    class Meta:
        model = BookingWindow
        fields = [
            'id', 'campaign', 'name', 'opens_at', 'closes_at',
            'courses', 'faculties', 'foreign_policy', 'criteria_display',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        opens = attrs.get('opens_at', getattr(self.instance, 'opens_at', None))
        closes = attrs.get('closes_at', getattr(self.instance, 'closes_at', None))
        if opens and closes and closes <= opens:
            raise serializers.ValidationError({'closes_at': 'Закрытие должно быть позже открытия.'})
        return attrs


class PlacementRuleSerializer(_CriteriaValidation, serializers.ModelSerializer):
    criteria_display = serializers.CharField(read_only=True)
    scope_display = serializers.CharField(read_only=True)
    level = serializers.CharField(read_only=True)

    class Meta:
        model = PlacementRule
        fields = [
            'id', 'campaign', 'building', 'floor', 'room', 'level', 'scope_display',
            'courses', 'faculties', 'foreign_policy', 'criteria_display', 'note',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        scopes = [attrs.get(k, getattr(self.instance, k, None)) for k in ('building', 'floor', 'room')]
        if sum(1 for s in scopes if s) != 1:
            raise serializers.ValidationError('Укажите ровно одно: корпус, этаж или комнату.')
        return attrs


class BuildingOrderSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)

    class Meta:
        model = BuildingOrder
        fields = ['id', 'campaign', 'building', 'building_name', 'priority', 'floor_direction', 'floor_order']
        read_only_fields = ['id']

    def validate_floor_order(self, value):
        try:
            return [int(n) for n in value]
        except (TypeError, ValueError):
            raise serializers.ValidationError('Номера этажей должны быть числами.')


class BookingSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    floor_number = serializers.IntegerField(source='room.floor.number', read_only=True)
    building_name = serializers.CharField(source='room.floor.building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)

    class Meta:
        model = Booking
        fields = [
            'id', 'campaign', 'resident', 'resident_name', 'room', 'room_number', 'floor_number', 'building_name',
            'beds', 'status', 'expires_at', 'created_by', 'created_by_name', 'assignment',
            'override_reason', 'note', 'created_at',
        ]
        read_only_fields = ['id', 'campaign', 'status', 'expires_at', 'created_by', 'assignment', 'created_at']


class ReserveSerializer(serializers.Serializer):
    resident = serializers.UUIDField()
    room = serializers.UUIDField()
    beds = serializers.IntegerField(required=False, default=1, min_value=1)
    override_reason = serializers.CharField(required=False, allow_blank=True, default='')
    note = serializers.CharField(required=False, allow_blank=True, default='')


class EligibleRoomSerializer(serializers.Serializer):
    id = serializers.UUIDField(source='room.id')
    room_number = serializers.CharField(source='room.room_number')
    floor = serializers.UUIDField(source='room.floor_id')
    floor_number = serializers.IntegerField(source='room.floor.number')
    building_id = serializers.UUIDField(source='room.floor.building_id')
    building_name = serializers.CharField(source='room.floor.building.name')
    capacity = serializers.IntegerField(source='room.capacity')
    current_occupancy = serializers.IntegerField(source='room.current_occupancy')
    monthly_price = serializers.DecimalField(source='room.monthly_price', max_digits=12, decimal_places=2)
    gender_policy = serializers.CharField(source='room.gender_policy')
    ok = serializers.BooleanField()
    reasons = serializers.ListField(child=serializers.CharField())
