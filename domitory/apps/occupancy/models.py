import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from common.mixins import TimestampMixin


class AccommodationContract(TimestampMixin):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Активный'
        EXPIRED = 'expired', 'Истёк'
        TERMINATED = 'terminated', 'Расторгнут'

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
    contract_number = models.CharField('Номер договора', max_length=50, unique=True)
    start_date = models.DateField('Дата начала')
    end_date = models.DateField('Дата окончания')
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
        ordering = ['-created_at', '-start_date']
        verbose_name = 'Договор'
        verbose_name_plural = 'Договоры'

    def __str__(self):
        return f'{self.contract_number} - {self.resident.full_name}'

    def clean(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError('End date must be after start date.')


class RoomAssignment(TimestampMixin):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Активное'
        COMPLETED = 'completed', 'Завершено'
        TRANSFERRED = 'transferred', 'Переведено'

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
    start_date = models.DateField('Дата начала')
    end_date = models.DateField('Дата окончания', null=True, blank=True)
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
        verbose_name = 'Назначение'
        verbose_name_plural = 'Назначения'

    def __str__(self):
        return f'{self.resident.full_name} -> Room {self.room.room_number}'


class StayRecord(TimestampMixin):
    class Reason(models.TextChoices):
        INITIAL_CHECK_IN = 'initial_check_in', 'Заселение'
        TRANSFER = 'transfer', 'Перевод'
        EVICTION = 'eviction', 'Выселение'
        GRADUATION = 'graduation', 'Выпуск'
        TEMPORARY_LEAVE = 'temporary_leave', 'Временный выезд'
        RETURN = 'return', 'Возвращение'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='stay_records',
    )
    check_in_at = models.DateTimeField('Заселение', null=True, blank=True)
    check_out_at = models.DateTimeField('Выезд', null=True, blank=True)
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
        verbose_name = 'Запись проживания'
        verbose_name_plural = 'Записи проживания'

    def __str__(self):
        return f'{self.resident.full_name} - {self.get_reason_display()}'
