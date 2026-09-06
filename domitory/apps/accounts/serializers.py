from rest_framework import serializers

from apps.accounts.models import User, Role
from apps.universities.serializers import UniversityShortSerializer


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']


class UserReadSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    university = UniversityShortSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role', 'university',
            'phone_number', 'photo', 'is_active',
            'passport_number', 'position',
            'date_joined',
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'password',
            'role', 'university', 'phone_number', 'photo',
            'passport_number', 'position',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'university': {'required': False, 'allow_null': True},
            'passport_number': {'required': False},
            'position': {'required': False},
        }


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'full_name', 'role', 'university',
            'phone_number', 'is_active',
            'passport_number', 'position',
        ]
        extra_kwargs = {'university': {'required': False, 'allow_null': True}}


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class MeSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    university = UniversityShortSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role', 'university',
            'phone_number', 'photo', 'position', 'date_joined',
        ]
