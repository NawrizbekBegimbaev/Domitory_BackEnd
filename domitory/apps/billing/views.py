from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAccountant
from apps.billing.filters import ChargeFilter, PaymentFilter
from apps.billing.models import Charge, Payment
from apps.billing.serializers import (
    ChargeListSerializer,
    PaymentCreateSerializer,
    PaymentListSerializer,
)
from apps.billing.services import PaymentService
from apps.residents.models import Resident


class ChargeViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsAccountant]
    filterset_class = ChargeFilter
    search_fields = ['resident__full_name']
    ordering_fields = ['period_year', 'period_month', 'amount', 'due_date']
    serializer_class = ChargeListSerializer

    def get_queryset(self):
        return Charge.objects.select_related('resident').all()


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAccountant]
    filterset_class = PaymentFilter
    search_fields = ['resident__full_name']
    ordering_fields = ['payment_date', 'amount', 'created_at']

    def get_queryset(self):
        return Payment.objects.select_related('resident', 'recorded_by').all()

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
