from rest_framework import serializers

from apps.accounts.models import User, Role


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']


class UserReadSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    organization_name = serializers.CharField(
        source='organization.name',
        read_only=True,
        default=None,
    )

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role',
            'organization', 'organization_name',
            'phone_number', 'is_active',
            'date_joined',
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'password',
            'role', 'organization', 'phone_number', 'is_active',
        ]
        read_only_fields = ['id']


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'full_name', 'role', 'organization',
            'phone_number', 'is_active',
        ]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class MeSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    organization_name = serializers.CharField(
        source='organization.name',
        read_only=True,
        default=None,
    )

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role',
            'organization', 'organization_name',
            'phone_number', 'date_joined',
        ]
