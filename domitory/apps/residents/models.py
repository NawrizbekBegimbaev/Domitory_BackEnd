import uuid
from django.db import models

from common.mixins import TimestampMixin
from common.validators import phone_validator


class Faculty(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university = models.ForeignKey(
        'universities.University', on_delete=models.CASCADE,
        related_name='faculties', verbose_name='Университет',
    )
    name = models.CharField('Название', max_length=150)

    class Meta:
        ordering = ['name']
        unique_together = [('university', 'name')]
        verbose_name = 'Факультет'
        verbose_name_plural = 'Факультеты'

    def __str__(self):
        return self.name


class Resident(TimestampMixin):
    class Gender(models.TextChoices):
        MALE = 'male', 'Мужской'
        FEMALE = 'female', 'Женский'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидает'
        ACTIVE = 'active', 'Активный'
        EVICTED = 'evicted', 'Выселен'
        GRADUATED = 'graduated', 'Выпустился'
        SUSPENDED = 'suspended', 'Приостановлен'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university = models.ForeignKey(
        'universities.University', on_delete=models.PROTECT,
        related_name='residents', verbose_name='Университет',
    )
    full_name = models.CharField('ФИО', max_length=150)
    birth_date = models.DateField('Дата рождения', null=True, blank=True)
    gender = models.CharField('Пол', max_length=10, choices=Gender.choices)
    phone_number = models.CharField('Телефон', max_length=17, blank=True, validators=[phone_validator])
    email = models.EmailField('Email', blank=True)
    student_number = models.CharField('Студ. билет', max_length=50)
    faculty = models.CharField('Факультет', max_length=150, blank=True)
    course = models.PositiveIntegerField('Курс', null=True, blank=True)
    # ISO 3166-1 alpha-2. Foreign student = any country other than HOME_COUNTRY.
    citizenship = models.CharField('Гражданство', max_length=2, default='UZ')
    photo = models.ImageField('Фото', upload_to='residents/photos/', blank=True)
    status = models.CharField('Статус', max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField('Заметки', blank=True)

    class Meta:
        ordering = ['full_name']
        unique_together = []
        verbose_name = 'Жилец'
        verbose_name_plural = 'Жильцы'

    HOME_COUNTRY = 'UZ'

    def __str__(self):
        return self.full_name

    @property
    def is_foreign(self):
        return (self.citizenship or self.HOME_COUNTRY).upper() != self.HOME_COUNTRY


class Guardian(TimestampMixin):
    class Relationship(models.TextChoices):
        FATHER = 'father', 'Отец'
        MOTHER = 'mother', 'Мать'
        SIBLING = 'sibling', 'Брат/Сестра'
        UNCLE = 'uncle', 'Дядя'
        AUNT = 'aunt', 'Тётя'
        OTHER = 'other', 'Другое'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='guardians', verbose_name='Жилец')
    full_name = models.CharField('ФИО', max_length=150)
    relationship = models.CharField('Родство', max_length=20, choices=Relationship.choices, default=Relationship.OTHER)
    phone_number = models.CharField('Телефон', max_length=17, validators=[phone_validator])
    is_emergency_contact = models.BooleanField('Экстренный контакт', default=False)

    class Meta:
        ordering = ['full_name']
        verbose_name = 'Опекун'
        verbose_name_plural = 'Опекуны'

    def __str__(self):
        return f'{self.full_name} ({self.get_relationship_display()})'


class ResidentDocument(TimestampMixin):
    class DocumentType(models.TextChoices):
        ID_CARD = 'id_card', 'ID-карта'
        PASSPORT = 'passport', 'Паспорт'
        DRIVERS_LICENSE = 'drivers_license', 'Водительское удостоверение'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='documents', verbose_name='Жилец')
    document_type = models.CharField('Тип документа', max_length=20, choices=DocumentType.choices)
    document_number = models.CharField('Номер документа', max_length=100, blank=True)
    file = models.FileField('Файл', upload_to='residents/documents/', blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Документ'
        verbose_name_plural = 'Документы'

    def __str__(self):
        return f'{self.get_document_type_display()} - {self.resident.full_name}'
