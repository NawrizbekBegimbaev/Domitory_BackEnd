from rest_framework import serializers

from apps.billing.models import Charge, Payment, PaymentAllocation


class ChargeListSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True, default=None)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Charge
        fields = [
            'id', 'resident', 'resident_name',
            'room', 'room_number',
            'period_month', 'period_year',
            'start_day', 'end_day', 'days_charged', 'is_prorated',
            'amount', 'paid_amount', 'remaining',
            'status', 'due_date',
        ]


class PaymentListSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True, default=None)
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
