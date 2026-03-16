import uuid
from django.db import models

from common.mixins import TimestampMixin
from common.validators import phone_validator


class Resident(TimestampMixin):
    class Gender(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EVICTED = 'evicted', 'Evicted'
        GRADUATED = 'graduated', 'Graduated'
        SUSPENDED = 'suspended', 'Suspended'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='residents',
    )
    full_name = models.CharField('Full name', max_length=150)
    birth_date = models.DateField('Birth date', null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices)
    phone_number = models.CharField(
        max_length=17,
        blank=True,
        validators=[phone_validator],
    )
    email = models.EmailField(blank=True)
    university_id = models.CharField('Student ID', max_length=50)
    faculty = models.CharField('Faculty', max_length=150, blank=True)
    course = models.PositiveIntegerField('Course', null=True, blank=True)
    photo = models.ImageField(upload_to='residents/photos/', blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['full_name']
        unique_together = [('organization', 'university_id')]

    def __str__(self):
        return self.full_name


class Guardian(TimestampMixin):
    class Relationship(models.TextChoices):
        FATHER = 'father', 'Father'
        MOTHER = 'mother', 'Mother'
        SIBLING = 'sibling', 'Sibling'
        UNCLE = 'uncle', 'Uncle'
        AUNT = 'aunt', 'Aunt'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        Resident,
        on_delete=models.CASCADE,
        related_name='guardians',
    )
    full_name = models.CharField('Full name', max_length=150)
    relationship = models.CharField(
        max_length=20,
        choices=Relationship.choices,
        default=Relationship.OTHER,
    )
    phone_number = models.CharField(
        max_length=17,
        validators=[phone_validator],
    )
    is_emergency_contact = models.BooleanField(default=False)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} ({self.get_relationship_display()})'


class ResidentDocument(TimestampMixin):
    class DocumentType(models.TextChoices):
        PASSPORT = 'passport', 'Passport'
        STUDENT_ID = 'student_id', 'Student ID'
        CONTRACT = 'contract', 'Contract'
        MEDICAL = 'medical', 'Medical certificate'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        Resident,
        on_delete=models.CASCADE,
        related_name='documents',
    )
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
    )
    document_number = models.CharField(max_length=100, blank=True)
    file = models.FileField(upload_to='residents/documents/')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_document_type_display()} - {self.resident.full_name}'
