import uuid
from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create', 'Создание'
        UPDATE = 'update', 'Изменение'
        DELETE = 'delete', 'Удаление'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=10, choices=Action.choices)
    model_name = models.CharField('Модель', max_length=100)
    object_id = models.CharField('ID объекта', max_length=255)
    changes = models.JSONField('Изменения', default=dict, blank=True)
    ip_address = models.GenericIPAddressField('IP адрес', null=True, blank=True)
    timestamp = models.DateTimeField('Время', auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Запись аудита'
        verbose_name_plural = 'Записи аудита'
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
        ]

    def __str__(self):
        return f'{self.user} {self.action} {self.model_name} {self.object_id}'
