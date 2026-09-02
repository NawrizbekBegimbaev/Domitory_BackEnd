import uuid
from django.db import models


class AccessEvent(models.Model):
    class Direction(models.TextChoices):
        IN = 'in', 'Вход'
        OUT = 'out', 'Выход'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='access_events',
        verbose_name='Жилец',
    )
    direction = models.CharField(
        'Направление',
        max_length=3,
        choices=Direction.choices,
    )
    timestamp = models.DateTimeField('Время события', db_index=True)
    device_name = models.CharField('Устройство', max_length=255, blank=True, default='')
    card_number = models.CharField('Номер карты', max_length=100, blank=True, default='')
    created_at = models.DateTimeField('Создано', auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Событие доступа'
        verbose_name_plural = 'События доступа'
        indexes = [
            models.Index(fields=['resident', '-timestamp']),
            models.Index(fields=['direction', '-timestamp']),
        ]

    def __str__(self):
        return f'{self.resident} - {self.get_direction_display()} - {self.timestamp}'
