import uuid
from django.db import models

from common.mixins import TimestampMixin


class Organization(TimestampMixin):
    class OrgType(models.TextChoices):
        UNIVERSITY = 'university', 'University'
        COLLEGE = 'college', 'College'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('Name', max_length=255)
    short_name = models.CharField('Short name', max_length=50, blank=True)
    org_type = models.CharField(
        'Type',
        max_length=20,
        choices=OrgType.choices,
        default=OrgType.UNIVERSITY,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=17, blank=True)
    address = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.short_name or self.name
