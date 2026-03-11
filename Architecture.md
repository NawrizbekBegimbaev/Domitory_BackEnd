# Архитектура системы Dormitory

> Solution Architecture Document
> Версия: 1.0
> Дата: 2026-03-11
> Основа: BusinessLogic.md

---

## 1. Архитектурные принципы

| # | Принцип | Описание |
|---|---------|----------|
| 1 | **Модульный монолит** | Единый Django-процесс, но код строго разделён на доменные модули (Django apps). Каждый модуль — замкнутый домен с собственными models, services, serializers, views, permissions. |
| 2 | **Доменная изоляция** | Модуль общается с другими модулями ТОЛЬКО через сервисный слой (services.py), а не через прямые queryset-обращения к чужим моделям. |
| 3 | **Fat Services, Thin Views** | Вся бизнес-логика живёт в `services.py`. Views/ViewSets — тонкие контроллеры: валидация входа, вызов сервиса, формирование ответа. |
| 4 | **Explicit > Implicit** | Никаких `from .models import *`. Все импорты явные. Все поля сериализаторов перечислены явно. |
| 5 | **Configuration as Environment** | Никаких секретов в коде. Всё через `.env` и переменные окружения. |
| 6 | **Organization-scoped data** | Все бизнес-данные привязаны к Organization. Queryset-ы фильтруются по организации текущего пользователя. |
| 7 | **Audit everything critical** | Любое изменение финансовых данных, проживания, договоров — логируется автоматически. |
| 8 | **API-first** | Бэкенд отдаёт только REST API. Фронтенд (веб и мобильный) — отдельные клиенты. |

---

## 2. Технологический стек

### Core

| Компонент | Технология | Версия | Обоснование |
|-----------|-----------|--------|-------------|
| Язык | Python | 3.12+ | Стабильная LTS-версия, полная поддержка typing |
| Фреймворк | Django | 4.2 LTS | Долгосрочная поддержка, зрелая ORM, admin |
| REST API | Django REST Framework | 3.15+ | Стандарт для Django REST API |
| База данных | PostgreSQL | 16+ | ACID, JSON-поля, полнотекстовый поиск |
| Аутентификация | SimpleJWT | 5.3+ | JWT access/refresh tokens |
| Фильтрация | django-filter | 24.0+ | Декларативная фильтрация queryset |
| API-документация | drf-spectacular | 0.27+ | OpenAPI 3.0 схема, Swagger UI, ReDoc |
| Изображения | Pillow | 11.0+ | Обработка загружаемых фото |
| CORS | django-cors-headers | 4.0+ | Кросс-доменные запросы от фронтенда |

### Infrastructure

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| WSGI-сервер | Gunicorn | Production-ready, мультипроцессный |
| Статика | WhiteNoise | Раздача static files без nginx на начальном этапе |
| Контейнеризация | Docker + docker-compose | Единообразная среда dev/staging/prod |
| CI/CD | GitHub Actions | Автотесты, линтинг, деплой |
| Хранение файлов | Local → S3 (позже) | Начинаем с локального, миграция на S3 через django-storages |

### Добавляемые зависимости (Этап 1)

| Пакет | Назначение |
|-------|------------|
| `django-filter` | Фильтрация API |
| `drf-spectacular` | OpenAPI-документация |
| `django-cors-headers` | CORS для фронтенда |
| `python-dotenv` или `django-environ` | Переменные окружения |
| `django-extensions` | Утилиты разработки (shell_plus, show_urls) |
| `pytest` + `pytest-django` | Тестирование |
| `factory-boy` | Фабрики тестовых данных |

### Добавляемые зависимости (Этап 2)

| Пакет | Назначение |
|-------|------------|
| `django-push-notifications` или `firebase-admin` | Push-уведомления |
| `celery` + `redis` | Фоновые задачи (уведомления, напоминания) |

### Добавляемые зависимости (Этап 3)

| Пакет | Назначение |
|-------|------------|
| `requests` / `httpx` | HTTP-клиент для платёжных провайдеров |
| `cryptography` | Шифрование конфигов провайдеров |

---

## 3. Целевая структура проекта

```
domitory/
│
├── config/                          # Конфигурация Django-проекта
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py              # Выбор настроек по DJANGO_SETTINGS_MODULE
│   │   ├── base.py                  # Общие настройки
│   │   ├── local.py                 # Локальная разработка (DEBUG=True, SQLite/PostgreSQL)
│   │   ├── production.py            # Production (DEBUG=False, PostgreSQL, безопасность)
│   │   └── test.py                  # Настройки для тестов (SQLite in-memory)
│   ├── urls.py                      # Корневой URL-конфигуратор
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/                            # Доменные модули
│   ├── __init__.py
│   │
│   ├── accounts/                    # Пользователи, роли, аутентификация
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   ├── signals.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_services.py
│   │   │   ├── test_views.py
│   │   │   └── factories.py
│   │   └── migrations/
│   │
│   ├── organizations/               # Организации
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── inventory/                   # Корпуса, этажи, комнаты
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   ├── querysets.py             # Кастомные QuerySet-менеджеры
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── residents/                   # Жильцы, опекуны, документы
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── occupancy/                   # Договоры, назначения, проживание
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── billing/                     # Тарифы, начисления, оплаты
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── admin.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── reports/                     # Отчёты
│   │   ├── __init__.py
│   │   ├── services.py              # Логика формирования отчётов
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── audit/                       # Аудит-лог
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── middleware.py            # Middleware для захвата request info
│   │   ├── mixins.py               # AuditableMixin для моделей
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── notifications/               # Уведомления (Этап 2)
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── tasks.py                 # Celery-задачи
│   │   ├── tests/
│   │   └── migrations/
│   │
│   └── payments/                    # Онлайн-платежи (Этап 3)
│       ├── __init__.py
│       ├── models.py
│       ├── services.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── webhooks.py              # Обработчики webhook
│       ├── providers/               # Абстракция провайдеров
│       │   ├── __init__.py
│       │   ├── base.py              # BasePaymentProvider (абстрактный)
│       │   ├── payme.py
│       │   └── click.py
│       ├── tasks.py                 # Celery: сверка, уведомления
│       ├── tests/
│       └── migrations/
│
├── common/                          # Общие компоненты (не Django app)
│   ├── __init__.py
│   ├── permissions.py               # Базовые permission-классы
│   ├── pagination.py                # Настройки пагинации
│   ├── exceptions.py                # Единый формат ошибок
│   ├── mixins.py                    # TimestampMixin, UUIDMixin и т.д.
│   ├── filters.py                   # Общие фильтры
│   ├── validators.py                # Общие валидаторы (телефон и т.д.)
│   ├── utils.py                     # Утилиты
│   └── enums.py                     # Общие enum-ы
│
├── manage.py
├── requirements/
│   ├── base.txt                     # Общие зависимости
│   ├── local.txt                    # Зависимости для разработки
│   ├── production.txt               # Зависимости для продакшена
│   └── test.txt                     # Зависимости для тестов
│
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── entrypoint.sh
│
├── docker-compose.yml               # Dev: Django + PostgreSQL + Redis
├── docker-compose.prod.yml          # Prod: + Gunicorn + Nginx
├── .env.example                     # Шаблон переменных окружения
├── .gitignore
├── pytest.ini                       # Конфигурация pytest
├── setup.cfg                        # Конфигурация flake8, mypy
├── Procfile                         # Heroku
└── runtime.txt                      # Python version
```

---

## 4. Архитектура модулей (детально)

### 4.1 Внутренняя архитектура каждого модуля

Каждый Django app следует единому паттерну:

```
Request → urls.py → views.py → serializers.py (валидация) → services.py (бизнес-логика) → models.py (БД)
                                                                                            ↓
                                                                              audit/services.py (логирование)
```

#### Слой `models.py` — Данные

```python
# Что здесь:
# - Определение полей и связей
# - Базовые constraints (unique_together, CheckConstraint)
# - __str__, Meta, ordering
# - Кастомные Manager/QuerySet (или в querysets.py)
#
# Чего здесь НЕТ:
# - Бизнес-логики (никаких save() переопределений с логикой)
# - Обращений к другим моделям из других модулей
```

#### Слой `services.py` — Бизнес-логика

```python
# Пример: apps/occupancy/services.py

from django.db import transaction
from apps.inventory.services import RoomService
from apps.audit.services import AuditService

class RoomAssignmentService:
    """Сервис назначения комнат."""

    @staticmethod
    @transaction.atomic
    def assign_resident_to_room(
        resident,
        room,
        contract,
        assigned_by,
    ):
        """
        Заселяет жильца в комнату.

        Проверки:
        - У жильца нет активного назначения
        - Комната не заполнена
        - Гендерная политика совпадает
        - У жильца есть активный договор

        Побочные эффекты:
        - Создаёт RoomAssignment
        - Обновляет Room.status
        - Создаёт StayRecord
        - Логирует в AuditLog
        """
        # 1. Валидация
        RoomService.validate_capacity(room)
        RoomService.validate_gender_policy(room, resident)
        # ...

        # 2. Создание назначения
        assignment = RoomAssignment.objects.create(
            contract=contract,
            resident=resident,
            room=room,
            start_date=date.today(),
            status=AssignmentStatus.ACTIVE,
            assigned_by=assigned_by,
        )

        # 3. Обновление комнаты
        RoomService.increment_occupancy(room)

        # 4. Запись пребывания
        StayRecord.objects.create(
            resident=resident,
            check_in_at=timezone.now(),
            reason=StayReason.INITIAL_CHECK_IN,
            recorded_by=assigned_by,
        )

        # 5. Аудит
        AuditService.log(
            user=assigned_by,
            action=AuditAction.CREATE,
            instance=assignment,
        )

        return assignment
```

**Правило:** views.py вызывает services.py. services.py работает с models. Один модуль вызывает сервисы другого модуля, но НЕ обращается к чужим моделям напрямую.

#### Слой `serializers.py` — Валидация и сериализация

```python
# Что здесь:
# - Сериализация моделей → JSON
# - Десериализация JSON → валидированные данные
# - Валидация полей (field-level и object-level)
# - Nested serializers для чтения
# - Отдельные сериализаторы для чтения и записи
#
# Чего здесь НЕТ:
# - Бизнес-логики
# - Обращений к БД (кроме валидации уникальности)

# Пример:
class RoomAssignmentReadSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source='resident.full_name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    # ...

class RoomAssignmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomAssignment
        fields = ['contract', 'resident', 'room', 'start_date']
```

#### Слой `views.py` — Тонкие контроллеры

```python
# Что здесь:
# - Роутинг HTTP-методов к действиям
# - Выбор serializer
# - Выбор permission
# - Вызов сервиса
# - Возврат Response
#
# Чего здесь НЕТ:
# - Бизнес-логики (никаких if/else по бизнес-правилам)
# - Прямых queryset-манипуляций (кроме get_queryset для фильтрации)

# Пример:
class RoomAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]
    filterset_class = RoomAssignmentFilter

    def get_queryset(self):
        return RoomAssignment.objects.filter(
            resident__organization=self.request.user.organization
        ).select_related('resident', 'room', 'contract')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return RoomAssignmentWriteSerializer
        return RoomAssignmentReadSerializer

    def perform_create(self, serializer):
        RoomAssignmentService.assign_resident_to_room(
            resident=serializer.validated_data['resident'],
            room=serializer.validated_data['room'],
            contract=serializer.validated_data['contract'],
            assigned_by=self.request.user,
        )
```

#### Слой `permissions.py` — Контроль доступа

```python
# Пример: apps/accounts/permissions.py

class RoleBasedPermission(permissions.BasePermission):
    """Базовый класс проверки роли."""
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role.name in self.allowed_roles

class IsPlatformAdmin(RoleBasedPermission):
    allowed_roles = ['platform_admin']

class IsUniversityAdmin(RoleBasedPermission):
    allowed_roles = ['platform_admin', 'university_admin']

class IsDormManager(RoleBasedPermission):
    allowed_roles = ['platform_admin', 'university_admin', 'dorm_manager']

class IsAccountant(RoleBasedPermission):
    allowed_roles = ['platform_admin', 'university_admin', 'accountant']

class IsSecurityStaff(RoleBasedPermission):
    allowed_roles = ['platform_admin', 'university_admin', 'dorm_manager', 'security_staff']

class IsStudent(RoleBasedPermission):
    allowed_roles = ['student']

# Object-level permission
class IsOwnOrganization(permissions.BasePermission):
    """Пользователь видит только данные своей организации."""
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        return True
```

---

### 4.2 Модуль `accounts`

#### Модели

```python
# apps/accounts/models.py

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    """Роль пользователя в системе."""

    class RoleName(models.TextChoices):
        PLATFORM_ADMIN = 'platform_admin', 'Администратор платформы'
        UNIVERSITY_ADMIN = 'university_admin', 'Администратор университета'
        DORM_MANAGER = 'dorm_manager', 'Комендант'
        ACCOUNTANT = 'accountant', 'Бухгалтер'
        SECURITY_STAFF = 'security_staff', 'Охрана'
        STUDENT = 'student', 'Студент'  # Этап 2

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, choices=RoleName.choices, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_role'

    def __str__(self):
        return self.get_name_display()


class User(AbstractUser):
    """Кастомная модель пользователя."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name='users',
        null=True,
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
    )
    phone_number = models.CharField(max_length=15, blank=True)
    is_active = models.BooleanField(default=True)

    # Используем email как логин
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']

    class Meta:
        db_table = 'accounts_user'

    def __str__(self):
        return self.full_name


# Этап 2
class StudentAccount(models.Model):
    """Связка аккаунта студента с анкетой жильца."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_account')
    resident = models.OneToOneField(
        'residents.Resident',
        on_delete=models.CASCADE,
        related_name='account',
    )
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_students',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_student_account'
```

**ВАЖНО:** В `config/settings/base.py` необходимо:
```python
AUTH_USER_MODEL = 'accounts.User'
```

---

### 4.3 Модуль `organizations`

#### Модели

```python
# apps/organizations/models.py

import uuid
from django.db import models


class Organization(models.Model):
    """Организация (университет, колледж)."""

    class OrgType(models.TextChoices):
        UNIVERSITY = 'university', 'Университет'
        COLLEGE = 'college', 'Колледж'
        OTHER = 'other', 'Другое'

    class OrgStatus(models.TextChoices):
        ACTIVE = 'active', 'Активна'
        INACTIVE = 'inactive', 'Неактивна'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=50, blank=True)
    org_type = models.CharField(max_length=20, choices=OrgType.choices, default=OrgType.UNIVERSITY)
    status = models.CharField(max_length=20, choices=OrgStatus.choices, default=OrgStatus.ACTIVE)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations_organization'
        ordering = ['name']

    def __str__(self):
        return self.name
```

---

### 4.4 Модуль `inventory`

#### Модели

```python
# apps/inventory/models.py

import uuid
from django.db import models


class Building(models.Model):
    """Корпус общежития."""

    class GenderPolicy(models.TextChoices):
        MALE_ONLY = 'male_only', 'Только мужчины'
        FEMALE_ONLY = 'female_only', 'Только женщины'
        MIXED = 'mixed', 'Смешанное'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='buildings',
    )
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    gender_policy = models.CharField(
        max_length=20,
        choices=GenderPolicy.choices,
        default=GenderPolicy.MIXED,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_building'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.organization.short_name})"


class Floor(models.Model):
    """Этаж корпуса."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='floors')
    number = models.PositiveIntegerField()
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'inventory_floor'
        unique_together = ['building', 'number']
        ordering = ['building', 'number']

    def __str__(self):
        return f"{self.building.name}, этаж {self.number}"


class Room(models.Model):
    """Комната в общежитии."""

    class RoomStatus(models.TextChoices):
        AVAILABLE = 'available', 'Доступна'
        FULL = 'full', 'Заполнена'
        MAINTENANCE = 'maintenance', 'Ремонт'
        CLOSED = 'closed', 'Закрыта'

    class GenderPolicy(models.TextChoices):
        MALE = 'male', 'Мужская'
        FEMALE = 'female', 'Женская'
        MIXED = 'mixed', 'Смешанная'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=20)
    capacity = models.PositiveIntegerField(default=4)
    current_occupancy = models.PositiveIntegerField(default=0)
    gender_policy = models.CharField(
        max_length=10,
        choices=GenderPolicy.choices,
        default=GenderPolicy.MIXED,
    )
    status = models.CharField(max_length=20, choices=RoomStatus.choices, default=RoomStatus.AVAILABLE)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_room'
        unique_together = ['floor', 'room_number']
        ordering = ['floor', 'room_number']
        constraints = [
            models.CheckConstraint(
                check=models.Q(current_occupancy__lte=models.F('capacity')),
                name='occupancy_not_exceeds_capacity',
            ),
        ]

    def __str__(self):
        return f"Комната {self.room_number}, {self.floor}"

    @property
    def available_places(self):
        return self.capacity - self.current_occupancy

    @property
    def is_full(self):
        return self.current_occupancy >= self.capacity
```

#### Сервисы

```python
# apps/inventory/services.py

from django.db import models
from apps.inventory.models import Room


class RoomService:
    """Сервис управления комнатами."""

    @staticmethod
    def validate_capacity(room):
        """Проверяет, что в комнате есть свободное место."""
        if room.is_full:
            raise ValidationError(
                f"Комната {room.room_number} заполнена "
                f"({room.current_occupancy}/{room.capacity})."
            )

    @staticmethod
    def validate_gender_policy(room, resident):
        """Проверяет гендерную политику комнаты."""
        if room.gender_policy == Room.GenderPolicy.MIXED:
            return
        if room.gender_policy == Room.GenderPolicy.MALE and resident.gender != 'male':
            raise ValidationError("Комната только для мужчин.")
        if room.gender_policy == Room.GenderPolicy.FEMALE and resident.gender != 'female':
            raise ValidationError("Комната только для женщин.")

    @staticmethod
    def increment_occupancy(room):
        """Увеличивает занятость на 1, обновляет статус."""
        Room.objects.filter(pk=room.pk).update(
            current_occupancy=models.F('current_occupancy') + 1
        )
        room.refresh_from_db()
        if room.is_full:
            room.status = Room.RoomStatus.FULL
            room.save(update_fields=['status'])

    @staticmethod
    def decrement_occupancy(room):
        """Уменьшает занятость на 1, обновляет статус."""
        Room.objects.filter(pk=room.pk).update(
            current_occupancy=models.F('current_occupancy') - 1
        )
        room.refresh_from_db()
        if room.status == Room.RoomStatus.FULL:
            room.status = Room.RoomStatus.AVAILABLE
            room.save(update_fields=['status'])

    @staticmethod
    def get_available_rooms(organization, building_id=None, floor_id=None, gender=None):
        """Возвращает список свободных комнат с фильтрацией."""
        qs = Room.objects.filter(
            floor__building__organization=organization,
            status=Room.RoomStatus.AVAILABLE,
            current_occupancy__lt=models.F('capacity'),
        ).select_related('floor', 'floor__building')

        if building_id:
            qs = qs.filter(floor__building_id=building_id)
        if floor_id:
            qs = qs.filter(floor_id=floor_id)
        if gender:
            qs = qs.filter(
                models.Q(gender_policy=gender) |
                models.Q(gender_policy=Room.GenderPolicy.MIXED)
            )
        return qs
```

---

### 4.5 Модуль `residents`

#### Модели

```python
# apps/residents/models.py

import uuid
from django.db import models
from django.core.validators import RegexValidator
from common.mixins import TimestampMixin

phone_validator = RegexValidator(
    r'^\d{10,15}$',
    'Введите корректный номер телефона из 10-15 цифр',
)


class Resident(TimestampMixin, models.Model):
    """Анкета жильца общежития."""

    class Gender(models.TextChoices):
        MALE = 'male', 'Мужской'
        FEMALE = 'female', 'Женский'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Проживает'
        EVICTED = 'evicted', 'Выселен'
        GRADUATED = 'graduated', 'Выпустился'
        SUSPENDED = 'suspended', 'Отстранён'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='residents',
    )
    full_name = models.CharField('ФИО', max_length=150)
    birth_date = models.DateField('Дата рождения')
    gender = models.CharField(max_length=10, choices=Gender.choices)
    phone_number = models.CharField(max_length=15, validators=[phone_validator])
    email = models.EmailField(blank=True)
    university_id = models.CharField('Номер студенческого', max_length=50)
    faculty = models.CharField('Факультет', max_length=200)
    course = models.PositiveSmallIntegerField('Курс', null=True, blank=True)
    photo = models.ImageField(upload_to='residents/photos/', blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    registration_date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'residents_resident'
        unique_together = ['organization', 'university_id']
        ordering = ['full_name']

    def __str__(self):
        return self.full_name


class Guardian(TimestampMixin, models.Model):
    """Родитель / опекун жильца."""

    class Relationship(models.TextChoices):
        FATHER = 'father', 'Отец'
        MOTHER = 'mother', 'Мать'
        GUARDIAN = 'guardian', 'Опекун'
        OTHER = 'other', 'Другой'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='guardians')
    full_name = models.CharField(max_length=150)
    relationship = models.CharField(max_length=20, choices=Relationship.choices)
    phone_number = models.CharField(max_length=15, validators=[phone_validator])
    address = models.TextField(blank=True)
    is_emergency_contact = models.BooleanField(default=False)

    class Meta:
        db_table = 'residents_guardian'

    def __str__(self):
        return f"{self.full_name} ({self.get_relationship_display()}) → {self.resident}"


class ResidentDocument(TimestampMixin, models.Model):
    """Документ жильца (паспорт, студенческий и т.д.)."""

    class DocType(models.TextChoices):
        PASSPORT = 'passport', 'Паспорт'
        STUDENT_ID = 'student_id', 'Студенческий билет'
        CONTRACT = 'contract', 'Договор'
        MEDICAL = 'medical', 'Медицинская справка'
        OTHER = 'other', 'Другой'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DocType.choices)
    document_number = models.CharField(max_length=100, blank=True)
    file = models.FileField(upload_to='residents/documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'residents_document'

    def __str__(self):
        return f"{self.get_document_type_display()} — {self.resident}"
```

---

### 4.6 Модуль `occupancy`

#### Модели

```python
# apps/occupancy/models.py

import uuid
from django.db import models
from django.conf import settings
from common.mixins import TimestampMixin


class AccommodationContract(TimestampMixin, models.Model):
    """Договор проживания."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Черновик'
        ACTIVE = 'active', 'Активный'
        EXPIRED = 'expired', 'Истёк'
        TERMINATED = 'terminated', 'Расторгнут'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident', on_delete=models.CASCADE, related_name='contracts',
    )
    building = models.ForeignKey(
        'inventory.Building', on_delete=models.PROTECT, related_name='contracts',
    )
    contract_number = models.CharField(max_length=50, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    signed_at = models.DateTimeField(null=True, blank=True)
    terminated_at = models.DateTimeField(null=True, blank=True)
    termination_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_contracts',
    )

    class Meta:
        db_table = 'occupancy_contract'
        ordering = ['-start_date']
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gt=models.F('start_date')),
                name='contract_end_after_start',
            ),
        ]

    def __str__(self):
        return f"Договор {self.contract_number} — {self.resident}"


class RoomAssignment(TimestampMixin, models.Model):
    """Назначение жильца в комнату."""

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Активно'
        COMPLETED = 'completed', 'Завершено'
        CANCELLED = 'cancelled', 'Отменено'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(
        AccommodationContract, on_delete=models.CASCADE, related_name='assignments',
    )
    resident = models.ForeignKey(
        'residents.Resident', on_delete=models.CASCADE, related_name='room_assignments',
    )
    room = models.ForeignKey(
        'inventory.Room', on_delete=models.PROTECT, related_name='assignments',
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='made_assignments',
    )

    class Meta:
        db_table = 'occupancy_room_assignment'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.resident} → {self.room} ({self.get_status_display()})"


class StayRecord(models.Model):
    """Фиксация физического присутствия."""

    class Reason(models.TextChoices):
        INITIAL_CHECK_IN = 'initial_check_in', 'Первичное заселение'
        RETURN = 'return', 'Возвращение'
        TRANSFER = 'transfer', 'Перевод'
        EVICTION = 'eviction', 'Выселение'
        GRADUATION = 'graduation', 'Выпуск'
        TEMPORARY_LEAVE = 'temporary_leave', 'Временный выезд'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident', on_delete=models.CASCADE, related_name='stay_records',
    )
    check_in_at = models.DateTimeField()
    check_out_at = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=30, choices=Reason.choices)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='recorded_stays',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'occupancy_stay_record'
        ordering = ['-check_in_at']
```

---

### 4.7 Модуль `billing`

#### Модели

```python
# apps/billing/models.py

import uuid
from django.db import models
from django.conf import settings
from common.mixins import TimestampMixin


class TariffPlan(TimestampMixin, models.Model):
    """Тарифный план."""

    class BillingPeriod(models.TextChoices):
        MONTHLY = 'monthly', 'Ежемесячно'
        QUARTERLY = 'quarterly', 'Ежеквартально'
        SEMESTER = 'semester', 'За семестр'
        YEARLY = 'yearly', 'За год'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='tariffs',
    )
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    billing_period = models.CharField(
        max_length=20, choices=BillingPeriod.choices, default=BillingPeriod.MONTHLY,
    )
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'billing_tariff_plan'

    def __str__(self):
        return f"{self.name} — {self.amount} ({self.get_billing_period_display()})"


class Charge(TimestampMixin, models.Model):
    """Начисление за период."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Ожидает оплаты'
        PARTIALLY_PAID = 'partially_paid', 'Частично оплачено'
        PAID = 'paid', 'Оплачено'
        OVERDUE = 'overdue', 'Просрочено'
        CANCELLED = 'cancelled', 'Отменено'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident', on_delete=models.CASCADE, related_name='charges',
    )
    tariff_plan = models.ForeignKey(
        TariffPlan, on_delete=models.PROTECT, related_name='charges',
    )
    period_month = models.PositiveSmallIntegerField()
    period_year = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    due_date = models.DateField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_charges',
    )

    class Meta:
        db_table = 'billing_charge'
        unique_together = ['resident', 'period_month', 'period_year']
        ordering = ['-period_year', '-period_month']

    def __str__(self):
        return f"Начисление {self.resident} за {self.period_month}/{self.period_year}"

    @property
    def paid_amount(self):
        return self.allocations.aggregate(
            total=models.Sum('amount')
        )['total'] or 0

    @property
    def remaining_amount(self):
        return self.amount - self.paid_amount


class Payment(TimestampMixin, models.Model):
    """Запись об оплате."""

    class PaymentMethod(models.TextChoices):
        CASH = 'cash', 'Наличные'
        BANK_TRANSFER = 'bank_transfer', 'Банковский перевод'
        CARD = 'card', 'Карта'          # Этап 3
        ONLINE = 'online', 'Онлайн'     # Этап 3

    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', 'Подтверждена'
        PENDING = 'pending', 'В обработке'
        CANCELLED = 'cancelled', 'Отменена'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident', on_delete=models.CASCADE, related_name='payments',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    receipt_number = models.CharField(max_length=50, blank=True)
    external_reference = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='recorded_payments',
    )

    class Meta:
        db_table = 'billing_payment'
        ordering = ['-payment_date']

    def __str__(self):
        return f"Оплата {self.amount} от {self.resident} ({self.payment_date})"


class PaymentAllocation(models.Model):
    """Распределение оплаты по начислениям."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='allocations')
    charge = models.ForeignKey(Charge, on_delete=models.CASCADE, related_name='allocations')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_payment_allocation'
        unique_together = ['payment', 'charge']

    def __str__(self):
        return f"{self.amount} из {self.payment} → {self.charge}"


class Discount(TimestampMixin, models.Model):
    """Скидка для жильца."""

    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Процент'
        FIXED = 'fixed', 'Фиксированная сумма'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        'residents.Resident', on_delete=models.CASCADE, related_name='discounts',
    )
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='approved_discounts',
    )

    class Meta:
        db_table = 'billing_discount'
```

#### Сервис расчёта задолженности

```python
# apps/billing/services.py

from decimal import Decimal
from django.db import models, transaction
from apps.billing.models import Charge, Payment, PaymentAllocation


class BillingService:
    """Финансовые операции."""

    @staticmethod
    def get_resident_balance(resident):
        """
        Возвращает баланс жильца.
        Положительное значение = долг, отрицательное = переплата.
        """
        total_charges = Charge.objects.filter(
            resident=resident,
            status__in=[
                Charge.Status.PENDING,
                Charge.Status.PARTIALLY_PAID,
                Charge.Status.OVERDUE,
            ],
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        total_allocated = PaymentAllocation.objects.filter(
            charge__resident=resident,
            charge__status__in=[
                Charge.Status.PENDING,
                Charge.Status.PARTIALLY_PAID,
                Charge.Status.OVERDUE,
            ],
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')

        return total_charges - total_allocated

    @staticmethod
    @transaction.atomic
    def record_payment(resident, amount, payment_method, recorded_by, notes=''):
        """
        Фиксирует оплату и автоматически распределяет по начислениям.
        """
        # 1. Создать Payment
        payment = Payment.objects.create(
            resident=resident,
            amount=amount,
            payment_date=date.today(),
            payment_method=payment_method,
            status=Payment.Status.CONFIRMED,
            recorded_by=recorded_by,
            notes=notes,
        )

        # 2. Распределить по неоплаченным начислениям (от старых к новым)
        remaining = amount
        unpaid_charges = Charge.objects.filter(
            resident=resident,
            status__in=[
                Charge.Status.PENDING,
                Charge.Status.PARTIALLY_PAID,
                Charge.Status.OVERDUE,
            ],
        ).order_by('period_year', 'period_month')

        for charge in unpaid_charges:
            if remaining <= 0:
                break

            charge_remaining = charge.remaining_amount
            allocation_amount = min(remaining, charge_remaining)

            PaymentAllocation.objects.create(
                payment=payment,
                charge=charge,
                amount=allocation_amount,
            )

            remaining -= allocation_amount

            # Обновить статус начисления
            if charge.remaining_amount <= 0:
                charge.status = Charge.Status.PAID
            else:
                charge.status = Charge.Status.PARTIALLY_PAID
            charge.save(update_fields=['status'])

        return payment

    @staticmethod
    def generate_monthly_charges(organization, year, month, created_by):
        """
        Генерирует начисления для всех активных жильцов за месяц.
        """
        from apps.residents.models import Resident
        from apps.occupancy.models import AccommodationContract

        active_contracts = AccommodationContract.objects.filter(
            building__organization=organization,
            status=AccommodationContract.Status.ACTIVE,
        ).select_related('resident')

        charges = []
        for contract in active_contracts:
            resident = contract.resident
            # Пропустить, если уже есть начисление за этот период
            if Charge.objects.filter(
                resident=resident,
                period_month=month,
                period_year=year,
            ).exists():
                continue

            # Получить тариф (из комнаты или дефолтный)
            tariff = TariffPlan.objects.filter(
                organization=organization,
                is_active=True,
            ).first()

            if not tariff:
                continue

            # Применить скидку
            amount = BillingService._apply_discount(resident, tariff.amount)

            charge = Charge(
                resident=resident,
                tariff_plan=tariff,
                period_month=month,
                period_year=year,
                amount=amount,
                due_date=date(year, month, 28),  # Крайний срок — 28 число
                created_by=created_by,
            )
            charges.append(charge)

        return Charge.objects.bulk_create(charges)

    @staticmethod
    def _apply_discount(resident, base_amount):
        """Применяет активную скидку жильца."""
        from apps.billing.models import Discount
        discount = Discount.objects.filter(
            resident=resident,
            is_active=True,
            start_date__lte=date.today(),
            end_date__gte=date.today(),
        ).first()

        if not discount:
            return base_amount

        if discount.discount_type == Discount.DiscountType.PERCENTAGE:
            return base_amount * (1 - discount.value / 100)
        else:
            return max(base_amount - discount.value, Decimal('0'))
```

---

### 4.8 Модуль `audit`

#### Модели и автоматическое логирование

```python
# apps/audit/models.py

import uuid
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """Запись аудита."""

    class Action(models.TextChoices):
        CREATE = 'create', 'Создание'
        UPDATE = 'update', 'Обновление'
        DELETE = 'delete', 'Удаление'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=10, choices=Action.choices)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=100, db_index=True)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f"[{self.action}] {self.model_name}#{self.object_id} by {self.user}"
```

```python
# apps/audit/services.py

from apps.audit.models import AuditLog


class AuditService:
    """Сервис аудит-логирования."""

    _current_user = None
    _current_ip = None

    @classmethod
    def set_request_context(cls, user, ip_address):
        """Вызывается из middleware для каждого запроса."""
        cls._current_user = user
        cls._current_ip = ip_address

    @classmethod
    def log(cls, user=None, action=None, instance=None, changes=None):
        """Создаёт запись аудита."""
        AuditLog.objects.create(
            user=user or cls._current_user,
            action=action,
            model_name=instance.__class__.__name__,
            object_id=str(instance.pk),
            changes=changes or {},
            ip_address=cls._current_ip,
        )

    @classmethod
    def log_changes(cls, instance, old_data, new_data, user=None):
        """Логирует конкретные изменения полей."""
        changes = {}
        for field, new_value in new_data.items():
            old_value = old_data.get(field)
            if old_value != new_value:
                changes[field] = {
                    'old': str(old_value),
                    'new': str(new_value),
                }
        if changes:
            cls.log(
                user=user,
                action=AuditLog.Action.UPDATE,
                instance=instance,
                changes=changes,
            )
```

```python
# apps/audit/middleware.py

from apps.audit.services import AuditService


class AuditMiddleware:
    """Middleware для установки контекста аудита (user, IP)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            ip = self._get_client_ip(request)
            AuditService.set_request_context(request.user, ip)
        response = self.get_response(request)
        return response

    @staticmethod
    def _get_client_ip(request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
```

---

## 5. Общие компоненты (`common/`)

```python
# common/mixins.py

from django.db import models


class TimestampMixin(models.Model):
    """Миксин с created_at и updated_at для всех моделей."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

```python
# common/pagination.py

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
```

```python
# common/exceptions.py

from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    """
    Единый формат ошибок:
    {
        "error": {
            "code": "validation_error",
            "message": "Описание ошибки",
            "details": { ... }
        }
    }
    """
    response = exception_handler(exc, context)
    if response is not None:
        error_data = {
            'error': {
                'code': _get_error_code(response.status_code),
                'message': _get_error_message(response.data),
                'details': response.data,
            }
        }
        response.data = error_data
    return response


def _get_error_code(status_code):
    codes = {
        400: 'validation_error',
        401: 'authentication_error',
        403: 'permission_denied',
        404: 'not_found',
        409: 'conflict',
        500: 'internal_error',
    }
    return codes.get(status_code, 'error')


def _get_error_message(data):
    if isinstance(data, dict):
        first_key = next(iter(data), None)
        if first_key:
            value = data[first_key]
            if isinstance(value, list):
                return str(value[0])
            return str(value)
    if isinstance(data, list):
        return str(data[0])
    return str(data)
```

---

## 6. Конфигурация (`config/settings/`)

### base.py (общие настройки)

```python
# config/settings/base.py

import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# --- Apps ---
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'django_filters',
    'drf_spectacular',
    'corsheaders',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.organizations',
    'apps.inventory',
    'apps.residents',
    'apps.occupancy',
    'apps.billing',
    'apps.reports',
    'apps.audit',
    # 'apps.notifications',  # Этап 2
    # 'apps.payments',       # Этап 3
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# --- Middleware ---
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.audit.middleware.AuditMiddleware',
]

# --- Auth ---
AUTH_USER_MODEL = 'accounts.User'

# --- REST Framework ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'common.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'EXCEPTION_HANDLER': 'common.exceptions.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# --- JWT ---
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# --- OpenAPI / Swagger ---
SPECTACULAR_SETTINGS = {
    'TITLE': 'Dormitory API',
    'DESCRIPTION': 'API системы управления общежитием',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# --- Internationalization ---
LANGUAGE_CODE = 'ru'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True

# --- Static & Media ---
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# --- Other ---
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
DEFAULT_AUTO_FIELD = 'django.db.models.UUIDField'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
```

### local.py (разработка)

```python
# config/settings/local.py

from .base import *
import environ

env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY', default='local-dev-secret-key-change-in-production')
DEBUG = True
ALLOWED_HOSTS = ['*']

# SQLite для быстрого старта, PostgreSQL для полного dev
DATABASES = {
    'default': env.db('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')
}

# CORS — разрешить всё в dev
CORS_ALLOW_ALL_ORIGINS = True

# Более подробные логи
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG' if env.bool('SQL_DEBUG', default=False) else 'WARNING',
        },
    },
}
```

### production.py (продакшен)

```python
# config/settings/production.py

from .base import *
import environ

env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

DATABASES = {
    'default': env.db('DATABASE_URL')
}

# Безопасность
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# CORS — только разрешённые домены
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])

# Статика через WhiteNoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

---

## 7. Корневые URL

```python
# config/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # API v1
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.organizations.urls')),
    path('api/v1/', include('apps.inventory.urls')),
    path('api/v1/', include('apps.residents.urls')),
    path('api/v1/', include('apps.occupancy.urls')),
    path('api/v1/', include('apps.billing.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
    # path('api/v1/notifications/', include('apps.notifications.urls')),  # Этап 2
    # path('api/v1/webhooks/', include('apps.payments.urls')),            # Этап 3
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## 8. Схема базы данных (ER-диаграмма)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ORGANIZATIONS                                  │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │ Organization │─────────────────┬──────────────┬───────────────┐      │
│  └──────────────┘                 │              │               │      │
│         │                         │              │               │      │
│         │ 1:N                     │ 1:N          │ 1:N           │ 1:N  │
│         ▼                         ▼              ▼               ▼      │
│  ┌──────────────┐          ┌──────────┐   ┌───────────┐  ┌──────────┐  │
│  │   Building   │          │   User   │   │  Resident │  │  Tariff  │  │
│  └──────────────┘          └──────────┘   └───────────┘  │   Plan   │  │
│         │                        │              │         └──────────┘  │
│         │ 1:N                    │              │              │        │
│         ▼                        │              │              │        │
│  ┌──────────────┐                │    ┌─────────┼────────┐    │        │
│  │    Floor     │                │    │         │        │    │        │
│  └──────────────┘                │    │         │        │    │        │
│         │                        │    ▼         ▼        ▼    ▼        │
│         │ 1:N                    │ ┌────────┐ ┌─────┐ ┌────────┐      │
│         ▼                        │ │Guardian│ │Doc  │ │ Charge │      │
│  ┌──────────────┐                │ └────────┘ └─────┘ └────────┘      │
│  │    Room      │◄───────┐       │                        ▲           │
│  └──────────────┘        │       │                        │           │
│         ▲                │       │                  ┌─────┴─────┐    │
│         │           ┌────┴─────┐ │                  │ Payment   │    │
│         │           │  Room    │ │                  │Allocation │    │
│         │           │Assignment│ │                  └─────┬─────┘    │
│         │           └────┬─────┘ │                        │          │
│         │                │       │                        ▼          │
│         │                │       │                  ┌───────────┐    │
│         │           ┌────┴─────┐ │                  │  Payment  │    │
│         │           │ Contract │ │                  └───────────┘    │
│         │           └────┬─────┘ │                                   │
│         │                │       │                                   │
│         │           ┌────┴─────┐ │                                   │
│         │           │  Stay    │ │                                   │
│         │           │ Record   │ │                                   │
│         │           └──────────┘ │                                   │
│         │                        │                                   │
│         │  ┌──────────────────┐  │                                   │
│         │  │  AuditLog        │──┘                                   │
│         │  └──────────────────┘                                      │
│         │                                                            │
│         │  ┌──────────────────┐   Этап 2                             │
│         └──│ BookingRequest   │                                      │
│            └──────────────────┘                                      │
│                                                                      │
│            ┌──────────────────┐   Этап 2                             │
│            │  Notification    │                                      │
│            └──────────────────┘                                      │
│                                                                      │
│            ┌──────────────────┐   Этап 3                             │
│            │OnlineTransaction │                                      │
│            └──────────────────┘                                      │
│            ┌──────────────────┐   Этап 3                             │
│            │PaymentProvider   │                                      │
│            └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Индексы базы данных

| Таблица | Индекс | Тип | Зачем |
|---------|--------|-----|-------|
| `residents_resident` | `(organization, university_id)` | UNIQUE | Уникальность студента в организации |
| `residents_resident` | `(organization, status)` | INDEX | Фильтрация по статусу |
| `inventory_room` | `(floor, room_number)` | UNIQUE | Уникальность номера комнаты |
| `inventory_room` | `(status, current_occupancy)` | INDEX | Поиск свободных комнат |
| `occupancy_room_assignment` | `(resident, status)` | INDEX | Поиск активного назначения |
| `occupancy_contract` | `(contract_number)` | UNIQUE | Уникальность номера договора |
| `billing_charge` | `(resident, period_month, period_year)` | UNIQUE | Одно начисление за период |
| `billing_charge` | `(status, due_date)` | INDEX | Поиск просроченных |
| `billing_payment` | `(resident, payment_date)` | INDEX | История оплат жильца |
| `audit_log` | `(model_name, object_id)` | INDEX | Поиск по объекту |
| `audit_log` | `(user, timestamp)` | INDEX | Поиск по пользователю |

---

## 9. Docker-конфигурация

### docker-compose.yml (dev)

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dormitory
      POSTGRES_USER: dormitory_user
      POSTGRES_PASSWORD: dormitory_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      - db

  # Этап 2: Redis для Celery
  # redis:
  #   image: redis:7-alpine
  #   ports:
  #     - "6379:6379"

  # Этап 2: Celery worker
  # celery:
  #   build:
  #     context: .
  #     dockerfile: docker/Dockerfile.dev
  #   command: celery -A config worker -l info
  #   volumes:
  #     - .:/app
  #   env_file:
  #     - .env
  #   depends_on:
  #     - db
  #     - redis

volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
# docker/Dockerfile

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/base.txt requirements/production.txt ./requirements/
RUN pip install --no-cache-dir -r requirements/production.txt

COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
```

### .env.example

```bash
# Django
SECRET_KEY=your-secret-key-here
DJANGO_SETTINGS_MODULE=config.settings.local
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://dormitory_user:dormitory_pass@localhost:5432/dormitory

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=30
REFRESH_TOKEN_LIFETIME_DAYS=7

# File storage (Этап 3: S3)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_STORAGE_BUCKET_NAME=

# Payment providers (Этап 3)
# PAYME_MERCHANT_ID=
# PAYME_SECRET_KEY=
# CLICK_MERCHANT_ID=
# CLICK_SECRET_KEY=
```

---

## 10. Тестирование

### Стратегия

| Уровень | Что тестируем | Инструмент | Покрытие |
|---------|---------------|-----------|----------|
| Unit | services.py — бизнес-логика | pytest + factory_boy | 90%+ |
| Unit | models.py — constraints, properties | pytest | 80%+ |
| Integration | views.py — API endpoints | DRF APIClient | 80%+ |
| Integration | permissions — доступ по ролям | DRF APIClient | 100% |
| E2E | Бизнес-сценарии (заселение, оплата) | pytest | Ключевые пути |

### Структура тестов

```python
# apps/occupancy/tests/factories.py

import factory
from apps.residents.models import Resident
from apps.inventory.models import Room
from apps.occupancy.models import AccommodationContract, RoomAssignment


class ResidentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Resident

    full_name = factory.Faker('name', locale='ru_RU')
    birth_date = factory.Faker('date_of_birth', minimum_age=17, maximum_age=30)
    gender = 'male'
    phone_number = factory.LazyFunction(lambda: '9981234567')
    university_id = factory.Sequence(lambda n: f'STU-{n:06d}')
    faculty = 'Информатика'
    status = Resident.Status.ACTIVE
```

```python
# apps/occupancy/tests/test_services.py

import pytest
from apps.occupancy.services import RoomAssignmentService

@pytest.mark.django_db
class TestRoomAssignment:
    def test_assign_resident_success(self, resident, room, contract, admin_user):
        assignment = RoomAssignmentService.assign_resident_to_room(
            resident=resident,
            room=room,
            contract=contract,
            assigned_by=admin_user,
        )
        assert assignment.status == 'active'
        room.refresh_from_db()
        assert room.current_occupancy == 1

    def test_assign_to_full_room_raises(self, resident, full_room, contract, admin_user):
        with pytest.raises(ValidationError, match='заполнена'):
            RoomAssignmentService.assign_resident_to_room(
                resident=resident,
                room=full_room,
                contract=contract,
                assigned_by=admin_user,
            )

    def test_gender_policy_violation_raises(self, female_resident, male_room, contract, admin_user):
        with pytest.raises(ValidationError, match='только для мужчин'):
            RoomAssignmentService.assign_resident_to_room(
                resident=female_resident,
                room=male_room,
                contract=contract,
                assigned_by=admin_user,
            )
```

---

## 11. Безопасность

| Угроза | Мера | Реализация |
|--------|------|-----------|
| Утечка SECRET_KEY | .env файл, не в git | `django-environ` + `.gitignore` |
| SQL Injection | ORM Django | Не использовать raw SQL |
| XSS | DRF автоэкранирование | JSON API, нет рендера HTML |
| CSRF | JWT (без cookies) | Токен в заголовке Authorization |
| Brute-force | Rate limiting | django-ratelimit на auth endpoints |
| Data leakage | Organization scope | Все queryset фильтруются по organization |
| Privilege escalation | Role-based permissions | Проверка роли на каждом endpoint |
| File upload attacks | Валидация типов | Pillow для изображений, ограничение размера |
| Sensitive data in logs | Фильтрация | Django LOGGING filter |

### Правило Organization Scope

**Каждый queryset в каждом ViewSet фильтруется по организации текущего пользователя:**

```python
def get_queryset(self):
    user = self.request.user
    if user.role.name == 'platform_admin':
        return self.model.objects.all()  # Видит всё
    return self.model.objects.filter(organization=user.organization)
```

Это гарантирует, что данные одной организации НИКОГДА не утекут в другую.

---

## 12. Миграция с текущего состояния

### План миграции

| Шаг | Действие | Риск |
|-----|----------|------|
| 1 | Создать новую структуру `config/` + `apps/` | Нулевой |
| 2 | Перенести settings в `config/settings/base.py` + `local.py` | Низкий |
| 3 | Создать `accounts` app с кастомным User | Средний — требует fresh DB |
| 4 | Создать `organizations`, `inventory` | Низкий |
| 5 | Создать `residents` (замена Student) | Средний — маппинг данных |
| 6 | Создать `occupancy` (замена полей floor/room/dates) | Средний |
| 7 | Создать `billing` (замена Payment) | Средний |
| 8 | Создать `audit`, `reports` | Низкий |
| 9 | Удалить старый `main` app | Низкий |
| 10 | Написать data migration скрипт (old → new) | Средний |

### Data Migration (если есть данные)

```python
# Скрипт миграции данных (management command)
# python manage.py migrate_legacy_data

# Student → Resident
# Student.floor, Student.room → RoomAssignment + Room
# Student.arrival_date, departure_date → AccommodationContract + StayRecord
# Parent → Guardian
# Payment → Payment (с добавлением amount) + Charge + PaymentAllocation
```

**Рекомендация:** Так как данных мало (проект в раннем состоянии), проще начать с чистой БД и ввести данные заново.

---

## 13. Мониторинг и логирование

### Логирование

```python
# config/settings/base.py

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'dormitory.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
        },
    },
}
```

### Метрики (будущее)

| Метрика | Зачем |
|---------|-------|
| Время ответа API (p50, p95, p99) | Производительность |
| Количество 4xx/5xx ошибок | Стабильность |
| Количество активных жильцов | Бизнес |
| Объём оплат за день | Бизнес |
| Количество транзакций (Этап 3) | Бизнес |

---

## 14. Архитектура по этапам (итог)

### Этап 1 — что деплоится

```
[Браузер: Админ-панель]
        │
        ▼
   [Nginx / WhiteNoise]
        │
        ▼
   [Gunicorn (3 workers)]
        │
        ▼
   [Django: config + 8 apps]
        │
        ▼
   [PostgreSQL]
```

### Этап 2 — добавляется

```
[Мобильное приложение]     [Браузер: Админ-панель]
        │                          │
        ▼                          ▼
   [Nginx / Load Balancer]
        │
        ▼
   [Gunicorn (3-5 workers)]
        │
        ├──────────────────┐
        ▼                  ▼
   [Django + 10 apps]   [Celery Worker]
        │                  │
        ▼                  ▼
   [PostgreSQL]        [Redis]
```

### Этап 3 — добавляется

```
[Моб. приложение] [Админ-панель]   [Payme]  [Click]
       │               │              │        │
       ▼               ▼              ▼        ▼
   [Nginx / Load Balancer]      [Webhook endpoints]
       │                               │
       ▼                               ▼
   [Gunicorn (5+ workers)]
       │
       ├──────────────────┐
       ▼                  ▼
   [Django + 11 apps]  [Celery Workers (2+)]
       │                  │
       ▼                  ▼
   [PostgreSQL]        [Redis]
       │
       ▼
   [S3 — файлы, чеки]
```

---

## 15. Зависимости между модулями

```
accounts ──────────────────────────────── (ни от кого не зависит, все зависят от него)
    ▲
    │
organizations ─────────────────────────── (зависит от accounts)
    ▲
    │
inventory ─────────────────────────────── (зависит от organizations)
    ▲
    │
residents ─────────────────────────────── (зависит от organizations)
    ▲
    │
occupancy ─────────────────────────────── (зависит от residents, inventory)
    ▲
    │
billing ───────────────────────────────── (зависит от residents, organizations)
    ▲
    │
reports ───────────────────────────────── (зависит от всех, read-only)
    │
audit ─────────────────────────────────── (зависит от accounts, используется всеми)
    │
notifications ─────────────────────────── (Этап 2, зависит от accounts)
    │
payments ──────────────────────────────── (Этап 3, зависит от billing, residents)
```

**Правило:** Зависимости ТОЛЬКО сверху вниз. Нижний модуль НИКОГДА не импортирует из верхнего. Если нужно обратное взаимодействие — через Django signals.

---

## 16. Порядок реализации (Этап 1)

| # | Задача | Зависит от | Результат |
|---|--------|-----------|-----------|
| 1 | Структура проекта: `config/`, `apps/`, `common/` | — | Скелет проекта |
| 2 | `config/settings/` + `.env` + Docker | #1 | Запускаемый проект |
| 3 | `common/` (mixins, pagination, exceptions, permissions) | #1 | Базовые компоненты |
| 4 | `apps/accounts` (User, Role, JWT) | #2, #3 | Аутентификация работает |
| 5 | `apps/organizations` (Organization) | #4 | Организация создаётся |
| 6 | `apps/inventory` (Building, Floor, Room) | #5 | Инфраструктура заполняется |
| 7 | `apps/residents` (Resident, Guardian, Document) | #5 | Жильцы регистрируются |
| 8 | `apps/occupancy` (Contract, Assignment, Stay) | #6, #7 | Заселение работает |
| 9 | `apps/billing` (Tariff, Charge, Payment, Allocation) | #7 | Финансы работают |
| 10 | `apps/audit` (AuditLog, middleware) | #4 | Аудит записывается |
| 11 | `apps/reports` (endpoints отчётов) | #6, #7, #8, #9 | Отчёты формируются |
| 12 | Django Admin (настройка для всех моделей) | #4–#11 | Админка готова |
| 13 | Тесты | #4–#11 | Покрытие 80%+ |
| 14 | API-документация (Swagger) | #4–#11 | Документация доступна |
| 15 | Удаление старого `main` app | #4–#14 | Чистый проект |
