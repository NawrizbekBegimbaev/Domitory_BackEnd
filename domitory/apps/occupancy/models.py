import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from common.mixins import TimestampMixin


class AccommodationContract(TimestampMixin):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        TERMINATED = 'terminated', 'Terminated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='contracts',
    )
    building = models.ForeignKey(
        'inventory.Building',
        on_delete=models.CASCADE,
        related_name='contracts',
    )
    contract_number = models.CharField('Contract number', max_length=50, unique=True)
    start_date = models.DateField('Start date')
    end_date = models.DateField('End date')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_contracts',
    )

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.contract_number} - {self.resident.full_name}'

    def clean(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError('End date must be after start date.')


class RoomAssignment(TimestampMixin):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        TRANSFERRED = 'transferred', 'Transferred'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(
        AccommodationContract,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    resident = models.ForeignKey(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='room_assignments',
    )
    room = models.ForeignKey(
        'inventory.Room',
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    start_date = models.DateField('Start date')
    end_date = models.DateField('End date', null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_rooms',
    )

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.resident.full_name} -> Room {self.room.room_number}'


class StayRecord(TimestampMixin):
    class Reason(models.TextChoices):
        INITIAL_CHECK_IN = 'initial_check_in', 'Initial check-in'
        TRANSFER = 'transfer', 'Transfer'
        EVICTION = 'eviction', 'Eviction'
        GRADUATION = 'graduation', 'Graduation'
        TEMPORARY_LEAVE = 'temporary_leave', 'Temporary leave'
        RETURN = 'return', 'Return'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='stay_records',
    )
    check_in_at = models.DateTimeField('Check-in', null=True, blank=True)
    check_out_at = models.DateTimeField('Check-out', null=True, blank=True)
    reason = models.CharField(
        max_length=30,
        choices=Reason.choices,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_stays',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.resident.full_name} - {self.get_reason_display()}'
