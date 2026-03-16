import uuid
from django.core.exceptions import ValidationError
from django.db import models

from common.mixins import TimestampMixin


class GenderPolicy(models.TextChoices):
    MALE_ONLY = 'male_only', 'Male only'
    FEMALE_ONLY = 'female_only', 'Female only'
    MIXED = 'mixed', 'Mixed'


class Building(TimestampMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='buildings',
    )
    name = models.CharField('Name', max_length=100)
    address = models.TextField('Address', blank=True)
    gender_policy = models.CharField(
        max_length=20,
        choices=GenderPolicy.choices,
        default=GenderPolicy.MIXED,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        unique_together = [('organization', 'name')]

    def __str__(self):
        return self.name


class Floor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='floors',
    )
    number = models.PositiveIntegerField('Floor number')
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['building', 'number']
        unique_together = [('building', 'number')]

    def __str__(self):
        return f'{self.building.name} - Floor {self.number}'


class Room(TimestampMixin):
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        FULL = 'full', 'Full'
        MAINTENANCE = 'maintenance', 'Maintenance'
        CLOSED = 'closed', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    floor = models.ForeignKey(
        Floor,
        on_delete=models.CASCADE,
        related_name='rooms',
    )
    room_number = models.CharField('Room number', max_length=20)
    capacity = models.PositiveIntegerField('Capacity', default=4)
    current_occupancy = models.PositiveIntegerField('Current occupancy', default=0)
    gender_policy = models.CharField(
        max_length=20,
        choices=GenderPolicy.choices,
        default=GenderPolicy.MIXED,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    monthly_price = models.DecimalField(
        'Monthly price',
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['floor__building__name', 'floor__number', 'room_number']
        unique_together = [('floor', 'room_number')]

    def __str__(self):
        return f'Room {self.room_number} (Floor {self.floor.number}, {self.floor.building.name})'

    def clean(self):
        if self.current_occupancy > self.capacity:
            raise ValidationError('Current occupancy cannot exceed capacity.')

    @property
    def available_beds(self):
        return self.capacity - self.current_occupancy

    @property
    def is_full(self):
        return self.current_occupancy >= self.capacity
