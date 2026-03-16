import uuid
from django.conf import settings
from django.db import models

from common.mixins import TimestampMixin


class TariffPlan(TimestampMixin):
    class BillingPeriod(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        SEMESTER = 'semester', 'Semester'
        YEARLY = 'yearly', 'Yearly'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='tariffs',
    )
    name = models.CharField('Name', max_length=100)
    amount = models.DecimalField('Amount', max_digits=12, decimal_places=2)
    billing_period = models.CharField(
        max_length=20,
        choices=BillingPeriod.choices,
        default=BillingPeriod.MONTHLY,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.amount})'


class Charge(TimestampMixin):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PARTIALLY_PAID = 'partially_paid', 'Partially paid'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='charges',
    )
    tariff_plan = models.ForeignKey(
        TariffPlan,
        on_delete=models.SET_NULL,
        null=True,
        related_name='charges',
    )
    period_month = models.PositiveIntegerField('Month')
    period_year = models.PositiveIntegerField('Year')
    amount = models.DecimalField('Amount', max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    due_date = models.DateField('Due date')

    class Meta:
        ordering = ['period_year', 'period_month']
        unique_together = [('resident', 'period_month', 'period_year')]

    def __str__(self):
        return f'{self.resident.full_name} - {self.period_month}/{self.period_year} ({self.amount})'

    @property
    def paid_amount(self):
        return self.allocations.aggregate(
            total=models.Sum('amount'),
        )['total'] or 0

    @property
    def remaining(self):
        return self.amount - self.paid_amount


class Payment(TimestampMixin):
    class Method(models.TextChoices):
        CASH = 'cash', 'Cash'
        BANK_TRANSFER = 'bank_transfer', 'Bank transfer'
        # CARD = 'card', 'Card'          # Stage 3
        # ONLINE = 'online', 'Online'    # Stage 3

    class Status(models.TextChoices):
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='payments',
    )
    amount = models.DecimalField('Amount', max_digits=12, decimal_places=2)
    payment_date = models.DateField('Payment date')
    payment_method = models.CharField(
        max_length=20,
        choices=Method.choices,
        default=Method.CASH,
    )
    external_reference = models.CharField(max_length=255, blank=True)  # Stage 3: webhook ref
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_payments',
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f'{self.resident.full_name} - {self.amount} ({self.payment_date})'


class PaymentAllocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='allocations',
    )
    charge = models.ForeignKey(
        Charge,
        on_delete=models.CASCADE,
        related_name='allocations',
    )
    amount = models.DecimalField('Amount', max_digits=12, decimal_places=2)

    class Meta:
        unique_together = [('payment', 'charge')]

    def __str__(self):
        return f'{self.payment} -> {self.charge} ({self.amount})'


class Discount(TimestampMixin):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Percentage'
        FIXED = 'fixed', 'Fixed amount'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='discounts',
    )
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
    )
    value = models.DecimalField('Value', max_digits=12, decimal_places=2)
    reason = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='approved_discounts',
    )

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.resident.full_name} - {self.get_discount_type_display()} {self.value}'
