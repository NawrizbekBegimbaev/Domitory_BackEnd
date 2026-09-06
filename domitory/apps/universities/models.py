import uuid
from django.db import models

from common.mixins import TimestampMixin


class University(TimestampMixin):
    """Tenant. Every building, resident, faculty and staff user belongs to one university.

    platform_admin and ministry users have no university and see everything.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('Название', max_length=255, unique=True)
    short_name = models.CharField('Краткое название', max_length=50, blank=True)
    city = models.CharField('Город', max_length=100, blank=True)
    address = models.TextField('Адрес', blank=True)
    contact_email = models.EmailField('Email', blank=True)
    contact_phone = models.CharField('Телефон', max_length=17, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Университет'
        verbose_name_plural = 'Университеты'

    def __str__(self):
        return self.short_name or self.name
