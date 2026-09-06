from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.core.exceptions import ValidationError as DjangoValidationError

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
from common.tenancy import UniversityScopedMixin, is_global_user, scope_queryset


class ContractViewSet(UniversityScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    filterset_class = ContractFilter
    search_fields = ['contract_number', 'resident__full_name']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    university_lookup = 'resident__university'

    def get_queryset(self):
        return self.scope(AccommodationContract.objects.select_related('resident', 'building', 'created_by').all())

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
        from rest_framework.exceptions import PermissionDenied, ValidationError
        resident = serializer.validated_data['resident']
        building = serializer.validated_data['building']
        if resident.university_id != building.university_id:
            raise ValidationError({'building': 'Корпус принадлежит другому университету.'})
        if not is_global_user(self.request.user) and resident.university_id != self.request.user.university_id:
            raise PermissionDenied('Жилец принадлежит другому университету.')
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        contract = self.get_object()
        ContractService.terminate_contract(contract, user=request.user)
        return Response(ContractDetailSerializer(contract).data)


class RoomAssignmentViewSet(UniversityScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    filterset_class = AssignmentFilter
    ordering_fields = ['start_date', 'created_at']
    university_lookup = 'resident__university'

    def get_queryset(self):
        return self.scope(RoomAssignment.objects.select_related(
            'contract', 'resident', 'room', 'room__floor', 'room__floor__building',
        ).all())

    def get_serializer_class(self):
        if self.action == 'create':
            return RoomAssignmentCreateSerializer
        return RoomAssignmentListSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'close', 'transfer'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        from django.core.exceptions import ValidationError as DjangoValidationError
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not is_global_user(request.user) and data['resident'].university_id != request.user.university_id:
            return Response({'error': {'code': 'PermissionDenied', 'message': 'Жилец принадлежит другому университету.', 'details': {}}}, status=status.HTTP_403_FORBIDDEN)
        try:
            assignment = RoomAssignmentService.assign_resident_to_room(
                resident=data['resident'],
                room=data['room'],
                contract=data['contract'],
                assigned_by=request.user,
                beds_purchased=data.get('beds_purchased', 1),
                override_reason=request.data.get('override_reason') or None,
            )
        except DjangoValidationError as e:
            return Response(
                {'error': {'code': 'ValidationError', 'message': str(e.message if hasattr(e, 'message') else e.messages[0]), 'details': {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            RoomAssignmentListSerializer(assignment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], url_path='full-room')
    def full_room(self, request):
        """Assign entire room to a group of residents."""
        from django.core.exceptions import ValidationError as DjangoValidationError
        from apps.residents.models import Resident
        from rest_framework import serializers as drf_serializers

        room_id = request.data.get('room')
        assignments_data = request.data.get('assignments', [])

        if not room_id or not assignments_data:
            return Response(
                {'error': {'message': 'room and assignments are required'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            room = scope_queryset(Room.objects.all(), request, 'floor__building__university').get(pk=room_id)
        except Room.DoesNotExist:
            return Response({'error': {'message': 'Room not found'}}, status=status.HTTP_404_NOT_FOUND)

        residents_qs = scope_queryset(Resident.objects.all(), request)
        contracts_qs = self.get_queryset().model.contract.field.related_model.objects.all()
        contracts_qs = scope_queryset(contracts_qs, request, 'resident__university')
        residents_and_contracts = []
        for item in assignments_data:
            try:
                resident = residents_qs.get(pk=item['resident'])
                contract = contracts_qs.get(pk=item['contract'])
                residents_and_contracts.append((resident, contract))
            except (Resident.DoesNotExist, AccommodationContract.DoesNotExist, KeyError) as e:
                return Response({'error': {'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = RoomAssignmentService.assign_full_room(
                residents_and_contracts, room, assigned_by=request.user,
                override_reason=request.data.get('override_reason') or None,
            )
        except DjangoValidationError as e:
            return Response(
                {'error': {'message': str(e.message if hasattr(e, 'message') else e.messages[0])}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            [RoomAssignmentListSerializer(a).data for a in result],
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
        new_room = scope_queryset(Room.objects.select_related('floor__building'), request, 'floor__building__university').get(pk=serializer.validated_data['new_room'])
        try:
            new_assignment = RoomAssignmentService.transfer_resident(
                assignment, new_room, user=request.user,
                override_reason=request.data.get('override_reason') or None,
            )
        except DjangoValidationError as e:
            return Response(
                {'error': {'code': 'ValidationError', 'message': str(e.message if hasattr(e, 'message') else e.messages[0]), 'details': {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            RoomAssignmentListSerializer(new_assignment).data,
            status=status.HTTP_201_CREATED,
        )


class StayRecordViewSet(UniversityScopedMixin, viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = StayRecordSerializer
    ordering_fields = ['created_at']
    university_lookup = 'resident__university'

    def get_queryset(self):
        return self.scope(StayRecord.objects.select_related('resident', 'recorded_by').all())
