import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from common.validators import phone_validator


class Role(models.Model):
    class RoleName(models.TextChoices):
        PLATFORM_ADMIN = 'platform_admin', 'Суперадмин'
        UNIVERSITY_ADMIN = 'university_admin', 'Администратор'
        DORM_MANAGER = 'dorm_manager', 'Комендант'
        ACCOUNTANT = 'accountant', 'Бухгалтер'
        SECURITY_STAFF = 'security_staff', 'Охранник'
        MINISTRY = 'ministry', 'Министерство'

    name = models.CharField('Название', max_length=50, choices=RoleName.choices, unique=True)
    description = models.CharField('Описание', max_length=255, blank=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Роль'
        verbose_name_plural = 'Роли'

    def __str__(self):
        return self.get_name_display()


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email обязателен')
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
    full_name = models.CharField('ФИО', max_length=150)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, null=True, blank=True, related_name='users', verbose_name='Роль')
    university = models.ForeignKey(
        'universities.University', on_delete=models.PROTECT, null=True, blank=True,
        related_name='users', verbose_name='Университет',
    )
    phone_number = models.CharField('Телефон', max_length=17, blank=True, null=True, unique=True, validators=[phone_validator])
    photo = models.ImageField('Фото', upload_to='users/photos/', blank=True)
    telegram_id = models.BigIntegerField('Telegram ID', null=True, blank=True, unique=True)
    # Staff card: filled in for ministry employees and university administrators
    passport_number = models.CharField('Паспорт', max_length=20, blank=True)
    position = models.CharField('Должность', max_length=150, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    class Meta:
        ordering = ['full_name']
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def save(self, *args, **kwargs):
        if not self.phone_number:
            self.phone_number = None
        super().save(*args, **kwargs)

    def __str__(self):
        return self.full_name

    @property
    def role_name(self):
        if self.role:
            return self.role.name
        return None


class TelegramLink(models.Model):
    """Stores phone↔telegram_id mapping from bot /start, before user is created."""
    phone_number = models.CharField('Телефон', max_length=17, unique=True)
    telegram_id = models.BigIntegerField('Telegram ID', unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Привязка Telegram'
        verbose_name_plural = 'Привязки Telegram'

    def __str__(self):
        return f'{self.phone_number} -> {self.telegram_id}'


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_otps')
    code = models.CharField('Код', max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'OTP сброса пароля'
        verbose_name_plural = 'OTP сброса пароля'

    def __str__(self):
        return f'{self.user.email} — {self.code}'

    @property
    def is_expired(self):
        from django.conf import settings
        from django.utils import timezone
        import datetime
        expiry = getattr(settings, 'PASSWORD_RESET_OTP_EXPIRY', 10)
        return timezone.now() > self.created_at + datetime.timedelta(minutes=expiry)
