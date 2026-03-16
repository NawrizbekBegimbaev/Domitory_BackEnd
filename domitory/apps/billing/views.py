from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAccountant, IsDormManager
from apps.billing.filters import ChargeFilter, PaymentFilter
from apps.billing.models import Charge, Discount, Payment, TariffPlan
from apps.billing.serializers import (
    BalanceSerializer,
    ChargeCreateSerializer,
    ChargeListSerializer,
    DiscountSerializer,
    GenerateChargesSerializer,
    PaymentCreateSerializer,
    PaymentListSerializer,
    TariffPlanSerializer,
)
from apps.billing.services import BalanceService, ChargeService, PaymentService
from apps.residents.models import Resident


class TariffPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAccountant]
    serializer_class = TariffPlanSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role_name == 'platform_admin':
            return TariffPlan.objects.all()
        return TariffPlan.objects.filter(organization=user.organization)


class ChargeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAccountant]
    filterset_class = ChargeFilter
    search_fields = ['resident__full_name']
    ordering_fields = ['period_year', 'period_month', 'amount', 'due_date']

    def get_queryset(self):
        user = self.request.user
        qs = Charge.objects.select_related('resident', 'tariff_plan')
        if user.role_name == 'platform_admin':
            return qs
        return qs.filter(resident__organization=user.organization)

    def get_serializer_class(self):
        if self.action == 'create':
            return ChargeCreateSerializer
        return ChargeListSerializer

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = GenerateChargesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tariff = TariffPlan.objects.get(pk=serializer.validated_data['tariff_plan'])
        result = ChargeService.generate_monthly_charges(
            organization=request.user.organization,
            tariff_plan=tariff,
            month=serializer.validated_data['month'],
            year=serializer.validated_data['year'],
        )
        return Response(result, status=status.HTTP_201_CREATED)


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAccountant]
    filterset_class = PaymentFilter
    search_fields = ['resident__full_name']
    ordering_fields = ['payment_date', 'amount', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related('resident', 'recorded_by')
        if user.role_name == 'platform_admin':
            return qs
        return qs.filter(resident__organization=user.organization)

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        resident = Resident.objects.get(pk=data['resident'])
        payment = PaymentService.record_payment(
            resident=resident,
            amount=data['amount'],
            payment_date=data['payment_date'],
            payment_method=data['payment_method'],
            recorded_by=request.user,
            notes=data.get('notes', ''),
        )
        return Response(
            PaymentListSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )


class DiscountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAccountant]
    serializer_class = DiscountSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Discount.objects.select_related('resident', 'approved_by')
        if user.role_name == 'platform_admin':
            return qs
        return qs.filter(resident__organization=user.organization)

    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)
