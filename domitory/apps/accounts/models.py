import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from common.validators import phone_validator


class Role(models.Model):
    class RoleName(models.TextChoices):
        PLATFORM_ADMIN = 'platform_admin', 'Platform Admin'
        UNIVERSITY_ADMIN = 'university_admin', 'University Admin'
        DORM_MANAGER = 'dorm_manager', 'Dorm Manager'
        ACCOUNTANT = 'accountant', 'Accountant'
        SECURITY_STAFF = 'security_staff', 'Security Staff'
        # STUDENT = 'student', 'Student'  # Этап 2

    name = models.CharField(
        max_length=50,
        choices=RoleName.choices,
        unique=True,
    )
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.get_name_display()


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField('Email', unique=True)
    full_name = models.CharField('Full name', max_length=150)
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='users',
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )
    phone_number = models.CharField(
        max_length=17,
        blank=True,
        validators=[phone_validator],
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name

    @property
    def role_name(self):
        if self.role:
            return self.role.name
        return None
