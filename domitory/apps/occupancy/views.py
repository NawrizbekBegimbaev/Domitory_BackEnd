from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsDormManager, IsSecurityStaff
from apps.inventory.models import Room
from apps.occupancy.filters import AssignmentFilter, ContractFilter
from apps.occupancy.models import AccommodationContract, RoomAssignment, StayRecord
from apps.occupancy.serializers import (
    ContractCreateSerializer,
    ContractDetailSerializer,
    ContractListSerializer,
    RoomAssignmentCreateSerializer,
    RoomAssignmentListSerializer,
    StayRecordSerializer,
    TransferSerializer,
)
from apps.occupancy.services import ContractService, RoomAssignmentService


class ContractViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    filterset_class = ContractFilter
    search_fields = ['contract_number', 'resident__full_name']
    ordering_fields = ['start_date', 'end_date', 'created_at']

    def get_queryset(self):
        return AccommodationContract.objects.select_related('resident', 'building', 'created_by').all()

    def get_serializer_class(self):
        if self.action == 'create':
            return ContractCreateSerializer
        if self.action == 'list':
            return ContractListSerializer
        return ContractDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'terminate'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        contract = self.get_object()
        ContractService.terminate_contract(contract, user=request.user)
        return Response(ContractDetailSerializer(contract).data)


class RoomAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    filterset_class = AssignmentFilter
    ordering_fields = ['start_date', 'created_at']

    def get_queryset(self):
        return RoomAssignment.objects.select_related(
            'contract', 'resident', 'room', 'room__floor', 'room__floor__building',
        ).all()

    def get_serializer_class(self):
        if self.action == 'create':
            return RoomAssignmentCreateSerializer
        return RoomAssignmentListSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'close', 'transfer'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        assignment = RoomAssignmentService.assign_resident_to_room(
            resident=data['resident'],
            room=data['room'],
            contract=data['contract'],
            assigned_by=request.user,
        )
        return Response(
            RoomAssignmentListSerializer(assignment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        assignment = self.get_object()
        RoomAssignmentService.evict_resident(assignment, user=request.user)
        return Response(RoomAssignmentListSerializer(assignment).data)

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        assignment = self.get_object()
        serializer = TransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_room = Room.objects.get(pk=serializer.validated_data['new_room'])
        new_assignment = RoomAssignmentService.transfer_resident(
            assignment, new_room, user=request.user,
        )
        return Response(
            RoomAssignmentListSerializer(new_assignment).data,
            status=status.HTTP_201_CREATED,
        )


class StayRecordViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = StayRecordSerializer
    ordering_fields = ['created_at']

    def get_queryset(self):
        return StayRecord.objects.select_related('resident', 'recorded_by').all()
