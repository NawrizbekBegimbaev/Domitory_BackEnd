import uuid
from django.core.exceptions import ValidationError
from django.db import models

from common.mixins import TimestampMixin


class GenderPolicy(models.TextChoices):
    MALE_ONLY = 'male_only', 'Только мужчины'
    FEMALE_ONLY = 'female_only', 'Только женщины'
    MIXED = 'mixed', 'Смешанный'


class Building(TimestampMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('Название', max_length=100)
    address = models.TextField('Адрес', blank=True)
    gender_policy = models.CharField(
        max_length=20,
        choices=GenderPolicy.choices,
        default=GenderPolicy.MIXED,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        unique_together = []
        verbose_name = 'Корпус'
        verbose_name_plural = 'Корпуса'

    def __str__(self):
        return self.name


class Floor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='floors',
    )
    number = models.PositiveIntegerField('Номер этажа')
    description = models.CharField('Описание', max_length=255, blank=True)

    class Meta:
        ordering = ['building', 'number']
        unique_together = [('building', 'number')]
        verbose_name = 'Этаж'
        verbose_name_plural = 'Этажи'

    def __str__(self):
        return f'{self.building.name} - Floor {self.number}'


class Room(TimestampMixin):
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Есть места'
        FULL = 'full', 'Занята'
        MAINTENANCE = 'maintenance', 'Ремонт'
        CLOSED = 'closed', 'Закрыта'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    floor = models.ForeignKey(
        Floor,
        on_delete=models.CASCADE,
        related_name='rooms',
    )
    room_number = models.CharField('Номер комнаты', max_length=20)
    capacity = models.PositiveIntegerField('Вместимость', default=4)
    current_occupancy = models.PositiveIntegerField('Текущая загрузка', default=0)
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
        'Цена в месяц',
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    description = models.CharField('Описание', max_length=255, blank=True)

    class Meta:
        ordering = ['floor__building__name', 'floor__number', 'room_number']
        unique_together = [('floor', 'room_number')]
        verbose_name = 'Комната'
        verbose_name_plural = 'Комнаты'

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
