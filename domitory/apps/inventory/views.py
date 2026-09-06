from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsDormManager, IsSecurityStaff
from apps.inventory.filters import BuildingFilter, FloorFilter, RoomFilter
from apps.inventory.models import Building, Floor, Room
from apps.inventory.serializers import (
    BuildingSerializer,
    FloorSerializer,
    RoomDetailSerializer,
    RoomListSerializer,
)
from common.tenancy import UniversityScopedMixin, university_for_create


def _assert_same_university(request, obj_university_id):
    """Scoped users may only attach children to parents of their own university."""
    from rest_framework.exceptions import PermissionDenied
    from common.tenancy import is_global_user
    if is_global_user(request.user):
        return
    if obj_university_id != request.user.university_id:
        raise PermissionDenied('Объект принадлежит другому университету.')


class BuildingViewSet(UniversityScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = BuildingSerializer
    filterset_class = BuildingFilter
    search_fields = ['name', 'address']
    ordering_fields = ['name', 'created_at']
    university_lookup = 'university'

    def get_queryset(self):
        return self.scope(Building.objects.select_related('university').all())

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(university=university_for_create(self.request, serializer.validated_data.get('university')))


class FloorViewSet(UniversityScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = FloorSerializer
    filterset_class = FloorFilter
    ordering_fields = ['number']
    university_lookup = 'building__university'

    def get_queryset(self):
        return self.scope(Floor.objects.select_related('building').all())

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

    def perform_create(self, serializer):
        _assert_same_university(self.request, serializer.validated_data['building'].university_id)
        serializer.save()


class RoomViewSet(UniversityScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    filterset_class = RoomFilter
    search_fields = ['room_number']
    ordering_fields = ['room_number', 'capacity', 'current_occupancy', 'monthly_price']
    university_lookup = 'floor__building__university'

    def get_queryset(self):
        return self.scope(Room.objects.select_related('floor', 'floor__building').all())

    def perform_create(self, serializer):
        _assert_same_university(self.request, serializer.validated_data['floor'].building.university_id)
        serializer.save()

    def get_serializer_class(self):
        if self.action == 'list':
            return RoomListSerializer
        return RoomDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

    def perform_update(self, serializer):
        room = self.get_object()
        new_status = serializer.validated_data.get('status', room.status)
        if new_status in ('maintenance', 'closed') and room.current_occupancy > 0:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'status': f'Невозможно перевести комнату в статус "{new_status}". Сначала переселите {room.current_occupancy} жильцов в другие комнаты.'
            })
        serializer.save()

    @action(detail=False, methods=['get'])
    def available(self, request):
        qs = self.get_queryset().filter(status=Room.Status.AVAILABLE)
        qs = self.filter_queryset(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = RoomListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = RoomListSerializer(qs, many=True)
        return Response(serializer.data)
