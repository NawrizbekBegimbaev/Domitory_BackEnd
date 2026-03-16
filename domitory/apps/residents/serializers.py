from rest_framework import serializers

from apps.residents.models import Guardian, Resident, ResidentDocument


class GuardianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guardian
        fields = [
            'id', 'resident', 'full_name', 'relationship',
            'phone_number', 'is_emergency_contact',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResidentDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResidentDocument
        fields = [
            'id', 'resident', 'document_type', 'document_number',
            'file', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResidentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = [
            'id', 'full_name', 'gender', 'phone_number',
            'university_id', 'faculty', 'course', 'status',
        ]


class ResidentDetailSerializer(serializers.ModelSerializer):
    guardians = GuardianSerializer(many=True, read_only=True)
    documents = ResidentDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Resident
        fields = [
            'id', 'organization', 'full_name', 'birth_date', 'gender',
            'phone_number', 'email', 'university_id', 'faculty', 'course',
            'photo', 'status', 'notes',
            'guardians', 'documents',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResidentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = [
            'id', 'organization', 'full_name', 'birth_date', 'gender',
            'phone_number', 'email', 'university_id', 'faculty', 'course',
            'photo', 'status', 'notes',
        ]
        read_only_fields = ['id']
