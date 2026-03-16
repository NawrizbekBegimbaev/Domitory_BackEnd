from django_filters import rest_framework as filters

from apps.billing.models import Charge, Payment


class ChargeFilter(filters.FilterSet):
    class Meta:
        model = Charge
        fields = {
            'status': ['exact'],
            'resident': ['exact'],
            'period_month': ['exact'],
            'period_year': ['exact'],
        }


class PaymentFilter(filters.FilterSet):
    date_from = filters.DateFilter(field_name='payment_date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='payment_date', lookup_expr='lte')

    class Meta:
        model = Payment
        fields = {
            'resident': ['exact'],
            'payment_method': ['exact'],
            'status': ['exact'],
        }
