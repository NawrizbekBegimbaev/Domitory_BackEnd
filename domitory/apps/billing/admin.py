from django.contrib import admin

from apps.billing.models import Charge, Discount, Payment, PaymentAllocation, TariffPlan


class AllocationInline(admin.TabularInline):
    model = PaymentAllocation
    extra = 0
    readonly_fields = ['charge', 'amount']


@admin.register(TariffPlan)
class TariffPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'amount', 'billing_period', 'is_active']
    list_filter = ['is_active', 'billing_period', 'organization']


@admin.register(Charge)
class ChargeAdmin(admin.ModelAdmin):
    list_display = [
        'resident', 'period_month', 'period_year',
        'amount', 'status', 'due_date',
    ]
    list_filter = ['status', 'period_year', 'period_month']
    search_fields = ['resident__full_name']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'resident', 'amount', 'payment_date',
        'payment_method', 'status', 'recorded_by',
    ]
    list_filter = ['payment_method', 'status']
    search_fields = ['resident__full_name']
    inlines = [AllocationInline]


@admin.register(PaymentAllocation)
class PaymentAllocationAdmin(admin.ModelAdmin):
    list_display = ['payment', 'charge', 'amount']


@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = [
        'resident', 'discount_type', 'value',
        'start_date', 'end_date', 'approved_by',
    ]
    list_filter = ['discount_type']
    search_fields = ['resident__full_name']
