from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsDormManager, IsSecurityStaff
from apps.residents.filters import ResidentFilter
from apps.residents.models import Guardian, Resident, ResidentDocument
from apps.residents.serializers import (
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
        user = self.request.user
        qs = Resident.objects.select_related('organization')
        if user.role_name == 'platform_admin':
            return qs
        return qs.filter(organization=user.organization)

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


class GuardianViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]
    serializer_class = GuardianSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Guardian.objects.select_related('resident')
        if user.role_name == 'platform_admin':
            return qs
        return qs.filter(resident__organization=user.organization)


class ResidentDocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]
    serializer_class = ResidentDocumentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ResidentDocument.objects.select_related('resident')
        if user.role_name == 'platform_admin':
            return qs
        return qs.filter(resident__organization=user.organization)
