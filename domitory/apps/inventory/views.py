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


class BuildingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]
    serializer_class = BuildingSerializer
    filterset_class = BuildingFilter
    search_fields = ['name', 'address']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        return Building.objects.all()


class FloorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]
    serializer_class = FloorSerializer
    filterset_class = FloorFilter
    ordering_fields = ['number']

    def get_queryset(self):
        return Floor.objects.select_related('building').all()


class RoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    filterset_class = RoomFilter
    search_fields = ['room_number']
    ordering_fields = ['room_number', 'capacity', 'current_occupancy', 'monthly_price']

    def get_queryset(self):
        return Room.objects.select_related('floor', 'floor__building').all()

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
