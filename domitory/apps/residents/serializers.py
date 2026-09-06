from rest_framework import serializers

from apps.residents.models import Faculty, Guardian, Resident, ResidentDocument


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = ['id', 'name', 'university']
        read_only_fields = ['id', 'university']


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
    # API keeps the historical name `university_id` for the student card number.
    university_id = serializers.CharField(source='student_number', read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)
    is_foreign = serializers.BooleanField(read_only=True)

    class Meta:
        model = Resident
        fields = [
            'id', 'university', 'university_name', 'full_name', 'gender', 'phone_number',
            'university_id', 'faculty', 'course', 'citizenship', 'is_foreign',
            'status', 'photo',
        ]


class ResidentDetailSerializer(serializers.ModelSerializer):
    university_id = serializers.CharField(source='student_number', read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)
    is_foreign = serializers.BooleanField(read_only=True)
    guardians = GuardianSerializer(many=True, read_only=True)
    documents = ResidentDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Resident
        fields = [
            'id', 'university', 'university_name', 'full_name', 'birth_date', 'gender',
            'phone_number', 'email', 'university_id', 'faculty', 'course',
            'citizenship', 'is_foreign',
            'photo', 'status', 'notes',
            'guardians', 'documents',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'university', 'created_at', 'updated_at']


class ResidentCreateUpdateSerializer(serializers.ModelSerializer):
    university_id = serializers.CharField(source='student_number', max_length=50)
    citizenship = serializers.CharField(max_length=2, required=False, default='UZ')

    class Meta:
        model = Resident
        fields = [
            'id', 'full_name', 'birth_date', 'gender',
            'phone_number', 'email', 'university_id', 'faculty', 'course',
            'citizenship', 'photo', 'status', 'notes',
        ]
        read_only_fields = ['id']

    def validate_citizenship(self, value):
        value = (value or 'UZ').strip().upper()
        if len(value) != 2 or not value.isalpha():
            raise serializers.ValidationError('Код страны должен быть из 2 латинских букв (ISO 3166-1).')
        return value
