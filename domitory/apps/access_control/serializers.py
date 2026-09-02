from rest_framework import serializers

from apps.access_control.models import AccessEvent


class AccessEventSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(
        source='resident.full_name', read_only=True,
    )
    direction_display = serializers.CharField(
        source='get_direction_display', read_only=True,
    )

    class Meta:
        model = AccessEvent
        fields = [
            'id', 'resident', 'resident_name',
            'direction', 'direction_display',
            'timestamp', 'device_name', 'card_number',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
