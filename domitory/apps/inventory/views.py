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
        user = self.request.user
        if user.role_name == 'platform_admin':
            return Building.objects.all()
        return Building.objects.filter(organization=user.organization)


class FloorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]
    serializer_class = FloorSerializer
    filterset_class = FloorFilter
    ordering_fields = ['number']

    def get_queryset(self):
        user = self.request.user
        qs = Floor.objects.select_related('building')
        if user.role_name == 'platform_admin':
            return qs
        return qs.filter(building__organization=user.organization)


class RoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    filterset_class = RoomFilter
    search_fields = ['room_number']
    ordering_fields = ['room_number', 'capacity', 'current_occupancy', 'monthly_price']

    def get_queryset(self):
        user = self.request.user
        qs = Room.objects.select_related('floor', 'floor__building')
        if user.role_name == 'platform_admin':
            return qs
        return qs.filter(floor__building__organization=user.organization)

    def get_serializer_class(self):
        if self.action == 'list':
            return RoomListSerializer
        return RoomDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

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
