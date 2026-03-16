from rest_framework import serializers

from apps.billing.models import Charge, Discount, Payment, PaymentAllocation, TariffPlan


class TariffPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TariffPlan
        fields = [
            'id', 'organization', 'name', 'amount',
            'billing_period', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentAllocationSerializer(serializers.ModelSerializer):
    period = serializers.SerializerMethodField()

    class Meta:
        model = PaymentAllocation
        fields = ['id', 'payment', 'charge', 'amount', 'period']

    def get_period(self, obj):
        return f'{obj.charge.period_month}/{obj.charge.period_year}'


class ChargeListSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Charge
        fields = [
            'id', 'resident', 'resident_name', 'tariff_plan',
            'period_month', 'period_year', 'amount',
            'paid_amount', 'remaining',
            'status', 'due_date',
        ]


class ChargeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Charge
        fields = [
            'id', 'resident', 'tariff_plan',
            'period_month', 'period_year', 'amount',
            'due_date',
        ]
        read_only_fields = ['id']


class GenerateChargesSerializer(serializers.Serializer):
    tariff_plan = serializers.UUIDField()
    month = serializers.IntegerField(min_value=1, max_value=12)
    year = serializers.IntegerField(min_value=2020, max_value=2100)


class PaymentListSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True, default=None)

    class Meta:
        model = Payment
        fields = [
            'id', 'resident', 'resident_name', 'amount',
            'payment_date', 'payment_method', 'status',
            'recorded_by', 'recorded_by_name', 'notes',
            'created_at',
        ]


class PaymentCreateSerializer(serializers.Serializer):
    resident = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_date = serializers.DateField()
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices)
    notes = serializers.CharField(required=False, default='')


class BalanceSerializer(serializers.Serializer):
    total_charges = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_payments = serializers.DecimalField(max_digits=12, decimal_places=2)
    debt = serializers.DecimalField(max_digits=12, decimal_places=2)


class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = [
            'id', 'resident', 'discount_type', 'value',
            'reason', 'start_date', 'end_date', 'approved_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'approved_by', 'created_at', 'updated_at']
