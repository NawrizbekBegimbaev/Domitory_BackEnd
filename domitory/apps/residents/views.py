from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsDormManager, IsSecurityStaff
from apps.residents.filters import ResidentFilter
from apps.residents.models import Faculty, Guardian, Resident, ResidentDocument
from apps.residents.serializers import (
    FacultySerializer,
    GuardianSerializer,
    ResidentCreateUpdateSerializer,
    ResidentDetailSerializer,
    ResidentDocumentSerializer,
    ResidentListSerializer,
)


class ResidentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    filterset_class = ResidentFilter
    search_fields = ['full_name', 'university_id', 'phone_number']
    ordering_fields = ['full_name', 'created_at', 'faculty', 'course']

    def get_queryset(self):
        return Resident.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return ResidentListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ResidentCreateUpdateSerializer
        return ResidentDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()

    def perform_destroy(self, instance):
        from apps.inventory.services import RoomService
        from apps.occupancy.models import RoomAssignment
        active_assignments = RoomAssignment.objects.filter(
            resident=instance, status=RoomAssignment.Status.ACTIVE,
        ).select_related('room')
        for assignment in active_assignments:
            RoomService.decrement_occupancy(assignment.room)
        instance.delete()

    @action(detail=True, methods=['get', 'post'], url_path='guardians')
    def guardians(self, request, pk=None):
        resident = self.get_object()
        if request.method == 'GET':
            serializer = GuardianSerializer(resident.guardians.all(), many=True)
            return Response(serializer.data)
        serializer = GuardianSerializer(data={**request.data, 'resident': resident.pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='balance')
    def balance(self, request, pk=None):
        from apps.billing.services import BalanceService
        from apps.billing.serializers import BalanceSerializer
        resident = self.get_object()
        data = BalanceService.get_resident_balance(resident)
        return Response(BalanceSerializer(data).data)

    @action(detail=True, methods=['post'], url_path='withdraw')
    def withdraw(self, request, pk=None):
        from decimal import Decimal
        from apps.billing.services import BalanceService
        from apps.billing.models import Payment
        from apps.audit.services import AuditService

        resident = self.get_object()
        bal = BalanceService.get_resident_balance(resident)
        overpayment = -bal['debt']  # debt is negative when overpaid

        if overpayment <= 0:
            return Response(
                {'error': {'code': 'ValidationError', 'message': 'No funds to withdraw', 'details': {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create negative payment (withdrawal)
        payment = Payment.objects.create(
            resident=resident,
            amount=-overpayment,
            payment_date=request.data.get('date', None) or __import__('django.utils', fromlist=['timezone']).timezone.now().date(),
            payment_method='cash',
            status=Payment.Status.COMPLETED,
            recorded_by=request.user,
            notes=f'Withdrawal: {overpayment}',
        )

        AuditService.log(request.user, 'create', payment, {
            'type': 'withdrawal',
            'amount': str(overpayment),
            'resident': str(resident),
        })

        new_bal = BalanceService.get_resident_balance(resident)
        return Response({
            'withdrawn': str(overpayment),
            'new_balance': str(new_bal['debt']),
        })

    @action(detail=True, methods=['get', 'post'], url_path='documents')
    def documents(self, request, pk=None):
        resident = self.get_object()
        if request.method == 'GET':
            serializer = ResidentDocumentSerializer(resident.documents.all(), many=True)
            return Response(serializer.data)
        data = request.data.copy()
        data['resident'] = resident.pk
        serializer = ResidentDocumentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='transfer')
    def transfer(self, request, pk=None):
        from apps.inventory.models import Room
        from apps.occupancy.models import RoomAssignment
        from apps.occupancy.services import RoomAssignmentService
        from apps.occupancy.serializers import RoomAssignmentListSerializer

        resident = self.get_object()
        new_room_id = request.data.get('new_room')
        if not new_room_id:
            return Response(
                {'error': {'code': 'ValidationError', 'message': 'new_room is required', 'details': {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_assignment = RoomAssignment.objects.filter(
            resident=resident, status=RoomAssignment.Status.ACTIVE,
        ).first()
        if not active_assignment:
            return Response(
                {'error': {'code': 'ValidationError', 'message': 'Resident has no active room assignment', 'details': {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            new_room = Room.objects.get(pk=new_room_id)
        except Room.DoesNotExist:
            return Response(
                {'error': {'code': 'NotFound', 'message': 'Room not found', 'details': {}}},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_assignment = RoomAssignmentService.transfer_resident(
            active_assignment, new_room, user=request.user,
        )
        return Response(
            RoomAssignmentListSerializer(new_assignment).data,
            status=status.HTTP_201_CREATED,
        )


class GuardianViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]
    serializer_class = GuardianSerializer

    def get_queryset(self):
        return Guardian.objects.select_related('resident').all()


class ResidentDocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]
    serializer_class = ResidentDocumentSerializer

    def get_queryset(self):
        return ResidentDocument.objects.select_related('resident').all()


class FacultyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSecurityStaff]
    serializer_class = FacultySerializer

    def get_queryset(self):
        return Faculty.objects.all()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsDormManager()]
        return super().get_permissions()
