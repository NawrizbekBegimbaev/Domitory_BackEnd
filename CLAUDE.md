# CLAUDE.md — Dormitory Platform

## Описание проекта

**Dormitory** — коммерческая платформа управления университетским общежитием.
Заменяет бумажный учёт (тетради, Excel) и автоматизирует работу администрации.

### Три этапа развития

| Этап | Цель | Пользователи |
|------|------|--------------|
| **1 (текущий)** | Административная веб-платформа | Сотрудники университета |
| **2** | Мобильное приложение для студентов | + студенты |
| **3** | Онлайн-оплата (Payme / Click) | + платёжные провайдеры |

**Сейчас реализуем: Этап 1.**

---

## Технологический стек

| Компонент | Технология |
|-----------|-----------|
| Язык | Python 3.12+ |
| Фреймворк | Django 4.2 LTS |
| REST API | Django REST Framework 3.15+ |
| База данных | PostgreSQL 16+ |
| Аутентификация | SimpleJWT 5.3+ |
| Фильтрация | django-filter |
| API-документация | drf-spectacular (OpenAPI 3.0) |
| Изображения | Pillow |
| CORS | django-cors-headers |
| WSGI | Gunicorn |
| Статика | WhiteNoise |
| Контейнеры | Docker + docker-compose |
| Тесты | pytest + pytest-django + factory-boy |

---

## Структура проекта

```
domitory/
├── config/
│   ├── settings/
│   │   ├── base.py          # Общие настройки
│   │   ├── local.py         # DEBUG=True, dev
│   │   ├── production.py    # DEBUG=False, prod
│   │   └── test.py          # SQLite in-memory
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/
│   ├── accounts/            # Пользователи, роли, JWT
│   ├── organizations/       # Организации (университеты)
│   ├── inventory/           # Корпуса, этажи, комнаты
│   ├── residents/           # Жильцы, опекуны, документы
│   ├── occupancy/           # Договоры, заселение, история
│   ├── billing/             # Тарифы, начисления, оплаты
│   ├── reports/             # Отчёты
│   └── audit/               # Аудит-лог
│
├── common/
│   ├── mixins.py            # TimestampMixin
│   ├── pagination.py        # StandardPagination
│   ├── exceptions.py        # Единый формат ошибок
│   ├── permissions.py       # RoleBasedPermission
│   └── validators.py        # Валидатор телефона
│
├── requirements/
│   ├── base.txt
│   ├── local.txt
│   └── production.txt
│
├── docker-compose.yml
├── .env.example
└── pytest.ini
```

Каждый app следует единому паттерну:
```
apps/{module}/
    models.py
    services.py       <- вся бизнес-логика здесь
    serializers.py
    views.py          <- тонкие контроллеры
    urls.py
    permissions.py
    filters.py
    admin.py
    tests/
    migrations/
```

---

## Архитектурные принципы

### 1. Fat Services, Thin Views
- Вся бизнес-логика — в `services.py`
- Views: принять запрос → вызвать сервис → вернуть ответ
- Никакой бизнес-логики в views, serializers, models

### 2. Доменная изоляция
- Модуль общается с другим модулем ТОЛЬКО через `services.py`
- Нельзя напрямую делать queryset к чужим моделям из другого модуля

### 3. Organization scope
- Все бизнес-данные привязаны к `Organization`
- Каждый queryset в ViewSet фильтруется по организации текущего пользователя:

```python
def get_queryset(self):
    if self.request.user.role.name == 'platform_admin':
        return Model.objects.all()
    return Model.objects.filter(organization=self.request.user.organization)
```

### 4. Explicit > Implicit
- Все импорты явные (никаких `from .models import *`)
- Все поля сериализаторов перечислены явно

### 5. Audit everything critical
- Любое изменение финансовых данных, проживания, договоров — логируется

---

## Роли и права (Этап 1)

| Роль | Описание | Ключевые права |
|------|----------|---------------|
| `platform_admin` | Суперадмин платформы | Полный доступ ко всему |
| `university_admin` | Администратор университета | Всё в своей организации |
| `dorm_manager` | Комендант | Жильцы, комнаты, заселение |
| `accountant` | Бухгалтер | Тарифы, начисления, оплаты |
| `security_staff` | Охрана | Только чтение: жильцы, комнаты |

Классы permissions в `apps/accounts/permissions.py`:
`IsPlatformAdmin`, `IsUniversityAdmin`, `IsDormManager`, `IsAccountant`, `IsSecurityStaff`

---

## Модели данных

### accounts
- `Role` — choices: platform_admin, university_admin, dorm_manager, accountant, security_staff
- `User` — id(UUID), email(логин), full_name, role(FK), organization(FK), phone, is_active

### organizations
- `Organization` — id(UUID), name, short_name, org_type, status, contacts, address

### inventory
- `Building` — id(UUID), organization(FK), name, address, gender_policy, is_active
- `Floor` — id(UUID), building(FK), number. UNIQUE: (building, number)
- `Room` — id(UUID), floor(FK), room_number, capacity, current_occupancy(default=0), gender_policy, status, monthly_price. UNIQUE: (floor, room_number). CHECK: occupancy <= capacity

### residents
- `Resident` — id(UUID), organization(FK), full_name, birth_date, gender, phone, university_id, faculty, course, photo, status, notes. UNIQUE: (organization, university_id)
- `Guardian` — id(UUID), resident(**FK** — не OneToOne!), full_name, relationship, phone, is_emergency_contact
- `ResidentDocument` — id(UUID), resident(FK), document_type, document_number, file

### occupancy
- `AccommodationContract` — resident(FK), building(FK), contract_number(unique), start_date, end_date, status, created_by. CHECK: end > start
- `RoomAssignment` — contract(FK), resident(FK), room(FK), start_date, end_date(null=проживает), status, assigned_by
- `StayRecord` — resident(FK), check_in_at, check_out_at, reason, recorded_by

### billing
- `TariffPlan` — organization(FK), name, amount(decimal), billing_period, is_active
- `Charge` — resident(FK), tariff_plan(FK), period_month, period_year, amount(decimal), status, due_date. UNIQUE: (resident, month, year)
- `Payment` — resident(FK), amount(decimal), payment_date, payment_method(cash/bank_transfer), status, recorded_by
- `PaymentAllocation` — payment(FK), charge(FK), amount(decimal). UNIQUE: (payment, charge)
- `Discount` — resident(FK), type(percentage/fixed), value, reason, dates, approved_by

### audit
- `AuditLog` — user(FK), action(create/update/delete), model_name, object_id, changes(JSON), ip_address, timestamp

---

## Ключевая бизнес-логика

### Заселение жильца

```
1. Создать Resident
2. Добавить Guardian (ForeignKey, может быть несколько)
3. Загрузить документы (ResidentDocument)
4. Создать AccommodationContract -> status: active
5. Создать RoomAssignment:
   Проверить: нет активного назначения у жильца
   Проверить: room.current_occupancy < room.capacity
   Проверить: гендерная политика комнаты
   Проверить: у жильца есть активный договор
   -> room.current_occupancy += 1
   -> room.status обновляется (если заполнена -> full)
6. Создать StayRecord (reason: initial_check_in)
7. AuditLog
```

### Выселение жильца

```
1. Закрыть RoomAssignment -> end_date=today, status=completed
   -> room.current_occupancy -= 1
   -> room.status обновляется (если было full -> available)
2. Расторгнуть AccommodationContract -> status=terminated
3. StayRecord (reason: eviction)
4. Resident.status -> evicted
```

### Перевод в другую комнату

```
1. Закрыть текущий RoomAssignment -> room_old.current_occupancy -= 1
2. Создать новый RoomAssignment -> room_new.current_occupancy += 1
3. StayRecord (reason: transfer)
```

### Ручная оплата (бухгалтер)

```
1. Создать Payment (amount, method, date)
2. Автоматически создать PaymentAllocation:
   -> Берём начисления от старых к новым (FIFO)
   -> Распределяем сумму
3. Обновить статусы Charge:
   -> paid_amount == charge.amount -> paid
   -> paid_amount < charge.amount -> partially_paid
4. AuditLog
```

### Расчёт задолженности

```
долг = SUM(charges WHERE status IN [pending, overdue, partially_paid])
     - SUM(allocations.amount WHERE charge IN (те же))
```

---

## API Endpoints (Этап 1)

Префикс: `/api/v1/`

```
POST   /auth/login/
POST   /auth/refresh/
GET    /auth/me/

GET/POST        /organizations/
GET/PUT/DELETE  /organizations/{id}/

GET/POST        /buildings/
GET/PUT/DELETE  /buildings/{id}/
GET/POST        /floors/
GET/PUT/DELETE  /floors/{id}/
GET/POST        /rooms/
GET/PUT/DELETE  /rooms/{id}/
GET             /rooms/available/

GET/POST        /residents/
GET/PUT/DELETE  /residents/{id}/
GET/POST        /residents/{id}/guardians/
GET/POST        /residents/{id}/documents/
GET             /residents/{id}/balance/
POST            /residents/{id}/transfer/

GET/POST        /contracts/
GET/PUT         /contracts/{id}/
POST            /contracts/{id}/terminate/
GET/POST        /assignments/
GET/PUT         /assignments/{id}/
POST            /assignments/{id}/close/

GET/POST        /tariffs/
GET/POST        /charges/
POST            /charges/generate/
GET/POST        /payments/

GET             /reports/occupancy/
GET             /reports/available-rooms/
GET             /reports/debtors/
GET             /reports/payments/
GET             /reports/residents/
GET             /reports/summary/

GET             /audit/
```

Требования ко всем endpoints:
- Пагинация (page / page_size)
- Фильтрация (django-filter)
- Поиск (search_fields)
- Сортировка (ordering)
- Единый формат ошибок: `{ "error": { "code": "...", "message": "...", "details": {...} } }`

---

## Стиль кода

### Сервис — правильно

```python
# apps/occupancy/services.py
class RoomAssignmentService:

    @staticmethod
    @transaction.atomic
    def assign_resident_to_room(resident, room, contract, assigned_by):
        # 1. Валидация
        RoomService.validate_capacity(room)
        RoomService.validate_gender_policy(room, resident)
        # 2. Создание
        assignment = RoomAssignment.objects.create(...)
        # 3. Побочные эффекты
        RoomService.increment_occupancy(room)
        StayRecord.objects.create(...)
        # 4. Аудит
        AuditService.log(user=assigned_by, action='create', instance=assignment)
        return assignment
```

### View — правильно

```python
# apps/occupancy/views.py
class RoomAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDormManager]

    def get_queryset(self):
        return RoomAssignment.objects.filter(
            resident__organization=self.request.user.organization
        ).select_related('resident', 'room', 'contract')

    def perform_create(self, serializer):
        RoomAssignmentService.assign_resident_to_room(
            resident=serializer.validated_data['resident'],
            room=serializer.validated_data['room'],
            contract=serializer.validated_data['contract'],
            assigned_by=self.request.user,
        )
```

### Что НЕЛЬЗЯ делать

```python
# Бизнес-логика в view — НЕЛЬЗЯ
def post(self, request):
    if room.current_occupancy >= room.capacity:  # <- не здесь!
        return Response(...)

# Прямой импорт чужих моделей между несвязанными модулями — НЕЛЬЗЯ
# В inventory нельзя: from apps.residents.models import Resident

# Бизнес-логика в serializer — НЕЛЬЗЯ
def validate(self, data):
    if data['room'].is_full:  # <- не здесь!
        raise ...
```

---

## Настройки (base.py)

```python
AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
    'DEFAULT_PAGINATION_CLASS': 'common.pagination.StandardPagination',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'EXCEPTION_HANDLER': 'common.exceptions.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

LANGUAGE_CODE = 'ru'
TIME_ZONE = 'Asia/Tashkent'
```

---

## Переменные окружения (.env)

```
SECRET_KEY=
DJANGO_SETTINGS_MODULE=config.settings.local
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://user:pass@localhost:5432/dormitory
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## Зависимости между модулями

```
accounts       <- все зависят от него
organizations  <- зависит от accounts
inventory      <- зависит от organizations
residents      <- зависит от organizations
occupancy      <- зависит от residents, inventory
billing        <- зависит от residents, organizations
reports        <- зависит от всех (read-only)
audit          <- использует accounts, вызывается из всех
```

Зависимости только вниз по этой цепочке. Нижний модуль никогда не импортирует из верхнего напрямую.

---

## Текущее состояние AS-IS

В существующем прототипе (`main/`) критичные архитектурные проблемы:
- `floor` и `room` хранятся как числа в `Student` (нет связей с Room/Floor)
- `Payment` не имеет поля суммы — только булево "оплачено/не оплачено"
- Нет истории проживания, ролей, Organization scope

Задача: переписать проект по новой архитектуре. Старый `main/` удалить после полного переноса.

---

## Порядок реализации

```
Фаза 1  -> config/, common/, .env, Docker, зависимости
Фаза 2  -> accounts + organizations (AUTH_USER_MODEL, JWT, роли, management commands)
Фаза 3  -> inventory (Building, Floor, Room, RoomService)
Фаза 4  -> residents (Resident, Guardian, Document)
Фаза 5  -> occupancy (Contract, Assignment, StayRecord, все сервисы заселения)
Фаза 6  -> billing (Tariff, Charge, Payment, Allocation, BillingService)
Фаза 7  -> audit (AuditLog, middleware, интеграция во все сервисы)
Фаза 8  -> reports (6 endpoint-ов с реальными данными)
Фаза 9  -> Django Admin (удобный UI для всех моделей)
Фаза 10 -> Тесты (покрытие services.py >= 80%)
Фаза 11 -> Удалить main/, деплой
```

Не начинать следующую фазу до выполнения критерия готовности текущей.

---

## Архитектурная готовность к будущим этапам

Заложить сейчас (НЕ реализовывать, только подготовить):
- `Role` с закомментированным choices `student` (добавим в Этапе 2)
- `Payment.payment_method` с закомментированными choices `card`, `online`
- `Payment.external_reference` поле (для webhook в Этапе 3)
- Пустые директории `apps/notifications/` и `apps/payments/`

---

## Что НЕ входит в Этап 1

- Мобильное приложение для студентов
- Роль `student` и её логика
- Онлайн-оплата (Payme / Click)
- Push-уведомления (Celery / Redis)
- Бронирование комнат студентами
- Заявки на ремонт

Не реализовывать это в рамках Этапа 1, даже если кажется несложным.

---

## Правила для Claude Code

1. Перед реализацией фазы — уточни, если что-то неоднозначно
2. Один app за раз — не переключайся между модулями в середине фазы
3. Проверяй критерий готовности перед переходом к следующей фазе
4. Тесты пишем сразу — не откладывай на конец
5. Не добавляй ничего за пределами scope Этапа 1
6. При архитектурных решениях — спроси, не решай самостоятельно
7. Никаких секретов в коде, только через .env
