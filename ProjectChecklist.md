# Dormitory — Полный план реализации

> Project Owner Checklist
> Дата: 2026-03-11
> Основа: BusinessLogic.md + Architecture.md

---

## Как пользоваться этим документом

- `[ ]` — не начато
- `[~]` — в работе
- `[x]` — завершено
- `[!]` — заблокировано (указать причину)
- **Критерий готовности** — каждый пункт считается завершённым ТОЛЬКО когда выполнен критерий

---

# ЭТАП 1: Административная платформа

> Цель: заменить бумажный учёт. Пользователи — только сотрудники университета.

---

## Фаза 1.1 — Фундамент проекта

> Без этого нельзя писать ни одной строки бизнес-логики.

### 1.1.1 Новая структура проекта

- [ ] Создать директорию `config/` с файлом `__init__.py`
- [ ] Создать `config/settings/__init__.py`
- [ ] Создать `config/settings/base.py` (общие настройки)
- [ ] Создать `config/settings/local.py` (DEBUG=True, SQLite/PostgreSQL)
- [ ] Создать `config/settings/production.py` (DEBUG=False, безопасность)
- [ ] Создать `config/settings/test.py` (SQLite in-memory для тестов)
- [ ] Создать `config/urls.py` (корневой роутер)
- [ ] Создать `config/wsgi.py`
- [ ] Создать `config/asgi.py`
- [ ] Создать директорию `apps/` с файлом `__init__.py`
- [ ] Создать директорию `common/` с файлом `__init__.py`
- [ ] Обновить `manage.py` — указать `config.settings.local` как default
- [ ] Обновить `Procfile` — указать `config.wsgi:application`

**Критерий готовности:** `python manage.py runserver` запускается с новой структурой без ошибок.

### 1.1.2 Конфигурация окружения

- [ ] Установить `django-environ`
- [ ] Создать файл `.env.example` с описанием всех переменных
- [ ] Создать `.env` (локальный, добавить в `.gitignore`)
- [ ] Вынести `SECRET_KEY` в `.env`
- [ ] Вынести `DATABASE_URL` в `.env`
- [ ] Вынести `DEBUG` в `.env`
- [ ] Вынести `ALLOWED_HOSTS` в `.env`

**Критерий готовности:** В коде нет ни одного захардкоженного секрета. Проект запускается через `.env`.

### 1.1.3 Очистка репозитория

- [ ] Создать правильный `.gitignore` (db.sqlite3, .env, __pycache__, media/, staticfiles/, *.pyc, .DS_Store)
- [ ] Удалить `db.sqlite3` из git-истории
- [ ] Удалить `staticfiles/` из git-истории
- [ ] Удалить `.DS_Store` из git-истории
- [ ] Убедиться, что `media/` в `.gitignore`

**Критерий готовности:** `git status` чистый. Нет чувствительных файлов в репозитории.

### 1.1.4 Зависимости

- [ ] Создать `requirements/base.txt` (общие пакеты)
- [ ] Создать `requirements/local.txt` (dev-зависимости: django-extensions, pytest, factory-boy)
- [ ] Создать `requirements/production.txt` (gunicorn, whitenoise)
- [ ] Создать `requirements/test.txt` (pytest, pytest-django, factory-boy)
- [ ] Добавить `django-filter` в base.txt
- [ ] Добавить `drf-spectacular` в base.txt
- [ ] Добавить `django-cors-headers` в base.txt
- [ ] Добавить `django-environ` в base.txt
- [ ] Удалить старый `requirements.txt` (заменён на `requirements/`)

**Критерий готовности:** `pip install -r requirements/local.txt` устанавливает всё без ошибок.

### 1.1.5 Docker (опционально, но рекомендовано)

- [ ] Создать `docker/Dockerfile.dev`
- [ ] Создать `docker/Dockerfile` (production)
- [ ] Создать `docker-compose.yml` (Django + PostgreSQL)
- [ ] Проверить: `docker-compose up` запускает проект

**Критерий готовности:** Один `docker-compose up` поднимает рабочий проект с PostgreSQL.

### 1.1.6 Общие компоненты (`common/`)

- [ ] Создать `common/mixins.py` — `TimestampMixin` (created_at, updated_at)
- [ ] Создать `common/pagination.py` — `StandardPagination` (page_size=20, max=100)
- [ ] Создать `common/exceptions.py` — единый формат ошибок API
- [ ] Создать `common/permissions.py` — базовые permission-классы (`RoleBasedPermission`)
- [ ] Создать `common/validators.py` — валидатор телефона
- [ ] Создать `common/enums.py` — общие enum-ы (если нужны)
- [ ] Настроить `REST_FRAMEWORK` в `base.py` (пагинация, фильтрация, поиск, сортировка, exception handler, schema class)
- [ ] Настроить `SIMPLE_JWT` в `base.py` (access 30 мин, refresh 7 дней)
- [ ] Настроить `SPECTACULAR_SETTINGS` в `base.py`

**Критерий готовности:** Все общие компоненты импортируются без ошибок. REST_FRAMEWORK настроен.

---

## Фаза 1.2 — Учётные записи и организации

> Кто пользуется системой и к какой организации принадлежит.

### 1.2.1 Модуль `accounts`

- [ ] Создать приложение `apps/accounts/`
- [ ] Создать модель `Role` (name, description)
  - [ ] Choices: platform_admin, university_admin, dorm_manager, accountant, security_staff
- [ ] Создать модель `User` (наследуется от AbstractUser)
  - [ ] Поля: id (UUID), email (unique, как логин), full_name, role (FK), organization (FK), phone_number, is_active
  - [ ] `USERNAME_FIELD = 'email'`
- [ ] Установить `AUTH_USER_MODEL = 'accounts.User'` в `base.py`
- [ ] Зарегистрировать `accounts` в `INSTALLED_APPS`
- [ ] Создать и применить миграции
- [ ] Создать `accounts/serializers.py`
  - [ ] `UserReadSerializer` (без пароля)
  - [ ] `UserCreateSerializer` (с паролем)
  - [ ] `LoginSerializer`
  - [ ] `MeSerializer` (текущий пользователь)
- [ ] Создать `accounts/services.py`
  - [ ] `AuthService.login(email, password)` → JWT tokens
  - [ ] `AuthService.create_user(data, created_by)` → User
- [ ] Создать `accounts/views.py`
  - [ ] `LoginView` (POST /api/v1/auth/login/)
  - [ ] `RefreshView` (POST /api/v1/auth/refresh/)
  - [ ] `MeView` (GET /api/v1/auth/me/)
  - [ ] `UserViewSet` (CRUD, только для admin)
- [ ] Создать `accounts/urls.py`
- [ ] Создать `accounts/permissions.py`
  - [ ] `IsPlatformAdmin`
  - [ ] `IsUniversityAdmin`
  - [ ] `IsDormManager`
  - [ ] `IsAccountant`
  - [ ] `IsSecurityStaff`
- [ ] Настроить `accounts/admin.py` (User, Role в Django Admin)
- [ ] Создать management command: `create_initial_roles` (создаёт 5 ролей)
- [ ] Создать management command: `create_superadmin` (создаёт platform_admin)

**Критерий готовности:**
1. Можно залогиниться через `/api/v1/auth/login/` и получить JWT
2. `/api/v1/auth/me/` возвращает данные текущего пользователя с ролью
3. Django Admin работает — можно создавать пользователей

### 1.2.2 Модуль `organizations`

- [ ] Создать приложение `apps/organizations/`
- [ ] Создать модель `Organization`
  - [ ] Поля: id (UUID), name, short_name, org_type (university/college/other), status (active/inactive), contact_email, contact_phone, address, created_at, updated_at
- [ ] Зарегистрировать в `INSTALLED_APPS`
- [ ] Создать и применить миграции
- [ ] Создать `organizations/serializers.py`
  - [ ] `OrganizationSerializer`
- [ ] Создать `organizations/services.py`
  - [ ] `OrganizationService.create_organization(data)`
- [ ] Создать `organizations/views.py`
  - [ ] `OrganizationViewSet` (CRUD, только platform_admin / university_admin)
- [ ] Создать `organizations/urls.py`
- [ ] Настроить `organizations/admin.py`
- [ ] Создать management command: `create_initial_organization` (создаёт первую организацию)

**Критерий готовности:**
1. CRUD для организаций работает через API
2. Организация видна в Django Admin
3. Пользователи привязаны к организации

### 1.2.3 Начальные данные

- [ ] Создать management command: `setup_initial_data` (вызывает все предыдущие команды)
  - [ ] Создаёт роли
  - [ ] Создаёт первую организацию
  - [ ] Создаёт суперадмина

**Критерий готовности:** Одна команда `python manage.py setup_initial_data` делает проект готовым к работе.

---

## Фаза 1.3 — Инфраструктура общежития

> Корпуса, этажи, комнаты — физическая структура.

### 1.3.1 Модуль `inventory`

- [ ] Создать приложение `apps/inventory/`
- [ ] Создать модель `Building`
  - [ ] Поля: id (UUID), organization (FK), name, address, gender_policy (male_only/female_only/mixed), is_active, created_at, updated_at
- [ ] Создать модель `Floor`
  - [ ] Поля: id (UUID), building (FK), number, description
  - [ ] Constraint: unique_together (building, number)
- [ ] Создать модель `Room`
  - [ ] Поля: id (UUID), floor (FK), room_number, capacity, current_occupancy (default=0), gender_policy, status (available/full/maintenance/closed), monthly_price, description, created_at, updated_at
  - [ ] Constraint: unique_together (floor, room_number)
  - [ ] Constraint: current_occupancy <= capacity
  - [ ] Property: available_places, is_full
- [ ] Зарегистрировать в `INSTALLED_APPS`
- [ ] Создать и применить миграции
- [ ] Создать `inventory/serializers.py`
  - [ ] `BuildingListSerializer` (краткий — для списков)
  - [ ] `BuildingDetailSerializer` (с вложенными этажами)
  - [ ] `FloorSerializer`
  - [ ] `RoomListSerializer` (краткий)
  - [ ] `RoomDetailSerializer` (с этажом, корпусом, свободные места)
  - [ ] `RoomWriteSerializer` (создание/обновление)
- [ ] Создать `inventory/services.py`
  - [ ] `RoomService.validate_capacity(room)` — проверка свободных мест
  - [ ] `RoomService.validate_gender_policy(room, resident)` — проверка пола
  - [ ] `RoomService.increment_occupancy(room)` — +1 жилец
  - [ ] `RoomService.decrement_occupancy(room)` — -1 жилец
  - [ ] `RoomService.get_available_rooms(organization, filters)` — свободные комнаты
  - [ ] `RoomService.get_occupancy_stats(organization)` — статистика занятости
- [ ] Создать `inventory/views.py`
  - [ ] `BuildingViewSet` (CRUD)
  - [ ] `FloorViewSet` (CRUD)
  - [ ] `RoomViewSet` (CRUD)
  - [ ] `RoomViewSet.available` — action для свободных комнат
- [ ] Создать `inventory/filters.py`
  - [ ] `RoomFilter` (building, floor, status, gender_policy, has_available_places)
- [ ] Создать `inventory/urls.py`
- [ ] Настроить `inventory/admin.py`
  - [ ] BuildingAdmin (list_display, list_filter, search)
  - [ ] FloorAdmin (list_display, list_filter)
  - [ ] RoomAdmin (list_display, list_filter, search, вычисляемое поле available_places)

**Критерий готовности:**
1. Можно создать корпус → этажи → комнаты через API и Admin
2. `/api/v1/rooms/available/` возвращает свободные комнаты с фильтрацией
3. `current_occupancy` корректно считается
4. Constraint не позволяет `current_occupancy > capacity`

---

## Фаза 1.4 — Жильцы

> Анкеты жильцов, родители, документы.

### 1.4.1 Модуль `residents`

- [ ] Создать приложение `apps/residents/`
- [ ] Создать модель `Resident`
  - [ ] Поля: id (UUID), organization (FK), full_name, birth_date, gender, phone_number, email, university_id, faculty, course, photo, status (active/evicted/graduated/suspended), registration_date, notes, created_at, updated_at
  - [ ] Constraint: unique_together (organization, university_id)
- [ ] Создать модель `Guardian`
  - [ ] Поля: id (UUID), resident (FK, not OneToOne!), full_name, relationship (father/mother/guardian/other), phone_number, address, is_emergency_contact
  - [ ] Важно: ForeignKey, не OneToOneField — у жильца может быть несколько опекунов
- [ ] Создать модель `ResidentDocument`
  - [ ] Поля: id (UUID), resident (FK), document_type (passport/student_id/contract/medical/other), document_number, file, uploaded_at
- [ ] Зарегистрировать в `INSTALLED_APPS`
- [ ] Создать и применить миграции
- [ ] Создать `residents/serializers.py`
  - [ ] `ResidentListSerializer` (краткий — для списков)
  - [ ] `ResidentDetailSerializer` (с guardians, documents, текущая комната)
  - [ ] `ResidentWriteSerializer` (создание/обновление)
  - [ ] `GuardianSerializer`
  - [ ] `ResidentDocumentSerializer`
- [ ] Создать `residents/services.py`
  - [ ] `ResidentService.create_resident(data, organization)`
  - [ ] `ResidentService.update_status(resident, new_status)`
  - [ ] `ResidentService.get_current_room(resident)` — текущая комната (из occupancy)
  - [ ] `ResidentService.search(organization, query)` — поиск по ФИО, студ. билету, телефону
- [ ] Создать `residents/views.py`
  - [ ] `ResidentViewSet` (CRUD)
  - [ ] `GuardianViewSet` (CRUD, вложен в resident)
  - [ ] `ResidentDocumentViewSet` (CRUD, вложен в resident)
- [ ] Создать `residents/filters.py`
  - [ ] `ResidentFilter` (status, faculty, course, gender, search по ФИО)
- [ ] Создать `residents/urls.py`
  - [ ] `/api/v1/residents/`
  - [ ] `/api/v1/residents/{id}/guardians/`
  - [ ] `/api/v1/residents/{id}/documents/`
- [ ] Настроить `residents/admin.py`
  - [ ] ResidentAdmin (list_display, list_filter, search_fields, inline: GuardianInline)
  - [ ] GuardianAdmin
  - [ ] ResidentDocumentAdmin

**Критерий готовности:**
1. CRUD для жильцов через API и Admin
2. Можно добавить несколько опекунов к одному жильцу
3. Можно загрузить документы (фото паспорта, студ. билет)
4. Поиск жильцов по ФИО, студ. билету, телефону работает
5. Фильтрация по статусу, факультету, курсу работает

---

## Фаза 1.5 — Проживание

> Договоры, заселение, выселение, перевод.

### 1.5.1 Модуль `occupancy`

- [ ] Создать приложение `apps/occupancy/`
- [ ] Создать модель `AccommodationContract`
  - [ ] Поля: id (UUID), resident (FK), building (FK), contract_number (unique, auto), start_date, end_date, status (draft/active/expired/terminated), signed_at, terminated_at, termination_reason, created_by (FK → User), created_at, updated_at
  - [ ] Constraint: end_date > start_date
- [ ] Создать модель `RoomAssignment`
  - [ ] Поля: id (UUID), contract (FK), resident (FK), room (FK), start_date, end_date (null=живёт), status (active/completed/cancelled), assigned_by (FK → User), created_at, updated_at
- [ ] Создать модель `StayRecord`
  - [ ] Поля: id (UUID), resident (FK), check_in_at, check_out_at (null=живёт), reason (initial_check_in/return/transfer/eviction/graduation/temporary_leave), notes, recorded_by (FK → User), created_at
- [ ] Зарегистрировать в `INSTALLED_APPS`
- [ ] Создать и применить миграции
- [ ] Создать `occupancy/serializers.py`
  - [ ] `ContractListSerializer`
  - [ ] `ContractDetailSerializer`
  - [ ] `ContractCreateSerializer`
  - [ ] `ContractTerminateSerializer` (reason)
  - [ ] `RoomAssignmentListSerializer`
  - [ ] `RoomAssignmentCreateSerializer`
  - [ ] `TransferSerializer` (new_room)
  - [ ] `StayRecordSerializer`
- [ ] Создать `occupancy/services.py`
  - [ ] `ContractService.create_contract(resident, building, dates, created_by)`
    - [ ] Проверка: у жильца нет активного договора
    - [ ] Автогенерация contract_number
  - [ ] `ContractService.terminate_contract(contract, reason, user)`
    - [ ] Закрытие всех активных RoomAssignment
    - [ ] Обновление статусов
  - [ ] `RoomAssignmentService.assign_resident_to_room(resident, room, contract, user)`
    - [ ] Проверка: нет активного назначения
    - [ ] Проверка: комната не заполнена
    - [ ] Проверка: гендерная политика
    - [ ] Проверка: есть активный договор
    - [ ] Создание RoomAssignment
    - [ ] Обновление room.current_occupancy
    - [ ] Создание StayRecord
    - [ ] Аудит-лог
  - [ ] `RoomAssignmentService.close_assignment(assignment, user)`
    - [ ] Установка end_date
    - [ ] Обновление room.current_occupancy
    - [ ] Создание StayRecord (выезд)
  - [ ] `RoomAssignmentService.transfer_resident(resident, new_room, user)`
    - [ ] Закрытие текущего назначения
    - [ ] Создание нового назначения
    - [ ] Обновление occupancy обеих комнат
    - [ ] Создание StayRecord (transfer)
- [ ] Создать `occupancy/views.py`
  - [ ] `ContractViewSet` (list, create, retrieve, terminate)
  - [ ] `RoomAssignmentViewSet` (list, create, retrieve, close)
  - [ ] `TransferView` (POST /api/v1/residents/{id}/transfer/)
  - [ ] `StayRecordViewSet` (list, retrieve — только чтение)
- [ ] Создать `occupancy/filters.py`
  - [ ] `ContractFilter` (status, resident, building, date range)
  - [ ] `RoomAssignmentFilter` (status, resident, room, building)
- [ ] Создать `occupancy/urls.py`
- [ ] Настроить `occupancy/admin.py`

**Критерий готовности:**
1. Полный цикл: создать договор → назначить комнату → жилец проживает
2. При заселении `room.current_occupancy` увеличивается, `room.status` обновляется
3. При выселении — уменьшается
4. Перевод в другую комнату работает корректно (старая -1, новая +1)
5. Нельзя заселить в полную комнату (ошибка 400)
6. Нельзя заселить мужчину в женскую комнату (ошибка 400)
7. Нельзя заселить без активного договора (ошибка 400)
8. История StayRecord сохраняется

---

## Фаза 1.6 — Финансы

> Тарифы, начисления, оплаты, задолженность.

### 1.6.1 Модуль `billing`

- [ ] Создать приложение `apps/billing/`
- [ ] Создать модель `TariffPlan`
  - [ ] Поля: id (UUID), organization (FK), name, amount (decimal), billing_period (monthly/quarterly/semester/yearly), is_active, description, created_at, updated_at
- [ ] Создать модель `Charge`
  - [ ] Поля: id (UUID), resident (FK), tariff_plan (FK), period_month, period_year, amount (decimal), status (pending/partially_paid/paid/overdue/cancelled), due_date, created_by (FK), created_at, updated_at
  - [ ] Constraint: unique_together (resident, period_month, period_year)
  - [ ] Property: paid_amount, remaining_amount
- [ ] Создать модель `Payment`
  - [ ] Поля: id (UUID), resident (FK), amount (decimal), payment_date, payment_method (cash/bank_transfer), status (confirmed/pending/cancelled), receipt_number, notes, recorded_by (FK), created_at, updated_at
- [ ] Создать модель `PaymentAllocation`
  - [ ] Поля: id (UUID), payment (FK), charge (FK), amount (decimal), created_at
  - [ ] Constraint: unique_together (payment, charge)
- [ ] Создать модель `Discount`
  - [ ] Поля: id (UUID), resident (FK), discount_type (percentage/fixed), value, reason, start_date, end_date, is_active, approved_by (FK), created_at, updated_at
- [ ] Зарегистрировать в `INSTALLED_APPS`
- [ ] Создать и применить миграции
- [ ] Создать `billing/serializers.py`
  - [ ] `TariffPlanSerializer`
  - [ ] `ChargeListSerializer`
  - [ ] `ChargeDetailSerializer` (с allocations)
  - [ ] `ChargeGenerateSerializer` (month, year — для массового создания)
  - [ ] `PaymentListSerializer`
  - [ ] `PaymentCreateSerializer` (ручной ввод оплаты)
  - [ ] `PaymentDetailSerializer` (с allocations)
  - [ ] `ResidentBalanceSerializer` (долг/переплата)
  - [ ] `DiscountSerializer`
- [ ] Создать `billing/services.py`
  - [ ] `BillingService.generate_monthly_charges(organization, year, month, user)`
    - [ ] Для каждого активного жильца с договором
    - [ ] Пропуск если начисление за период уже есть
    - [ ] Применение скидки
  - [ ] `BillingService.record_payment(resident, amount, method, user)`
    - [ ] Создание Payment
    - [ ] Автоматическое распределение по начислениям (старые первые)
    - [ ] Обновление статусов Charge
    - [ ] Аудит-лог
  - [ ] `BillingService.get_resident_balance(resident)` → сумма долга
  - [ ] `BillingService.get_debtors(organization)` → список должников
  - [ ] `BillingService.mark_overdue_charges()` → обновить просроченные
- [ ] Создать `billing/views.py`
  - [ ] `TariffPlanViewSet` (CRUD)
  - [ ] `ChargeViewSet` (list, create, retrieve)
  - [ ] `ChargeViewSet.generate` — action для массового создания
  - [ ] `PaymentViewSet` (list, create, retrieve)
  - [ ] `ResidentBalanceView` (GET /api/v1/residents/{id}/balance/)
  - [ ] `DiscountViewSet` (CRUD)
- [ ] Создать `billing/filters.py`
  - [ ] `ChargeFilter` (resident, status, period, date range)
  - [ ] `PaymentFilter` (resident, method, date range)
- [ ] Создать `billing/urls.py`
- [ ] Настроить `billing/admin.py`
  - [ ] ChargeAdmin (list_display со статусом, суммой, жильцом, периодом; list_filter по статусу)
  - [ ] PaymentAdmin (list_display с суммой, методом, жильцом; list_filter по дате, методу)
  - [ ] TariffPlanAdmin
  - [ ] DiscountAdmin

**Критерий готовности:**
1. Можно создать тариф, создать начисления за месяц (одно / массово)
2. Можно внести ручную оплату — она автоматически распределяется по начислениям
3. Баланс жильца считается правильно
4. Список должников формируется
5. Нельзя создать дубль начисления за тот же месяц (ошибка 400)
6. Частичная оплата корректно меняет статус на `partially_paid`
7. Полная оплата меняет статус на `paid`

---

## Фаза 1.7 — Аудит

> Кто, когда и что изменил.

### 1.7.1 Модуль `audit`

- [ ] Создать приложение `apps/audit/`
- [ ] Создать модель `AuditLog`
  - [ ] Поля: id (UUID), user (FK), action (create/update/delete), model_name, object_id, changes (JSONField), ip_address, timestamp
  - [ ] Индексы: (model_name, object_id), (user, timestamp)
- [ ] Создать `audit/middleware.py` — `AuditMiddleware` (захват user и IP из request)
- [ ] Создать `audit/services.py`
  - [ ] `AuditService.set_request_context(user, ip)`
  - [ ] `AuditService.log(user, action, instance, changes)`
  - [ ] `AuditService.log_changes(instance, old_data, new_data)`
- [ ] Добавить `AuditMiddleware` в `MIDDLEWARE` в `base.py`
- [ ] Зарегистрировать в `INSTALLED_APPS`
- [ ] Создать и применить миграции
- [ ] Создать `audit/serializers.py`
  - [ ] `AuditLogSerializer`
- [ ] Создать `audit/views.py`
  - [ ] `AuditLogViewSet` (только list и retrieve, только для admin)
- [ ] Создать `audit/filters.py`
  - [ ] `AuditLogFilter` (model_name, user, action, date range)
- [ ] Создать `audit/urls.py`
- [ ] Настроить `audit/admin.py` (readonly)
- [ ] Интегрировать аудит в существующие сервисы:
  - [ ] `occupancy/services.py` — логировать заселение, выселение, перевод
  - [ ] `billing/services.py` — логировать оплаты, начисления
  - [ ] `residents/services.py` — логировать изменения статуса

**Критерий готовности:**
1. При заселении/выселении/оплате автоматически создаётся запись в AuditLog
2. В записи видно: кто, когда, что сделал, какие поля изменились
3. Аудит-лог доступен через API с фильтрацией
4. Записи нельзя редактировать или удалять через API

---

## Фаза 1.8 — Отчёты

> Сводная информация для администрации.

### 1.8.1 Модуль `reports`

- [ ] Создать приложение `apps/reports/`
- [ ] Создать `reports/services.py`
  - [ ] `ReportService.occupancy_report(organization, building_id=None)`
    - [ ] Корпус → этаж → вместимость / занято / свободно / % занятости
  - [ ] `ReportService.available_rooms_report(organization, filters)`
    - [ ] Список комнат с свободными местами
  - [ ] `ReportService.debtors_report(organization)`
    - [ ] Жильцы с долгом: ФИО, сумма, период, месяцев просрочки
  - [ ] `ReportService.payments_report(organization, date_from, date_to)`
    - [ ] Все оплаты за период: дата, жилец, сумма, способ
  - [ ] `ReportService.residents_report(organization, filters)`
    - [ ] Список жильцов: ФИО, комната, корпус, статус, телефон
  - [ ] `ReportService.summary_report(organization)`
    - [ ] Всего жильцов, свободных мест, общая задолженность, собрано за месяц
- [ ] Создать `reports/serializers.py`
  - [ ] Сериализаторы для каждого отчёта
- [ ] Создать `reports/views.py`
  - [ ] `OccupancyReportView` (GET /api/v1/reports/occupancy/)
  - [ ] `AvailableRoomsReportView` (GET /api/v1/reports/available-rooms/)
  - [ ] `DebtorsReportView` (GET /api/v1/reports/debtors/)
  - [ ] `PaymentsReportView` (GET /api/v1/reports/payments/)
  - [ ] `ResidentsReportView` (GET /api/v1/reports/residents/)
  - [ ] `SummaryReportView` (GET /api/v1/reports/summary/)
- [ ] Создать `reports/urls.py`

**Критерий готовности:**
1. Все 6 отчётов возвращают корректные данные
2. Отчёты фильтруются по организации текущего пользователя
3. Отчёт по должникам правильно считает суммы и сроки
4. Сводный отчёт показывает общую картину

---

## Фаза 1.9 — Django Admin (доработка)

> Удобная панель для администрации — это и есть UI Этапа 1.

- [ ] Настроить кастомный заголовок Admin (`site_header`, `site_title`)
- [ ] `ResidentAdmin`:
  - [ ] list_display: ФИО, статус, факультет, курс, текущая комната, телефон
  - [ ] list_filter: status, faculty, gender
  - [ ] search_fields: full_name, university_id, phone_number
  - [ ] inlines: GuardianInline, ResidentDocumentInline
  - [ ] readonly_fields: registration_date, created_at, updated_at
- [ ] `RoomAdmin`:
  - [ ] list_display: номер, этаж, корпус, вместимость, занято, свободно, статус, цена
  - [ ] list_filter: status, gender_policy, floor__building
  - [ ] Вычисляемое поле: available_places
- [ ] `ContractAdmin`:
  - [ ] list_display: номер, жилец, корпус, даты, статус
  - [ ] list_filter: status, building
  - [ ] Actions: terminate_selected (массовое расторжение)
- [ ] `RoomAssignmentAdmin`:
  - [ ] list_display: жилец, комната, дата начала, дата конца, статус
  - [ ] list_filter: status, room__floor__building
- [ ] `ChargeAdmin`:
  - [ ] list_display: жилец, период, сумма, оплачено, остаток, статус, крайний срок
  - [ ] list_filter: status, period_year, period_month
  - [ ] Вычисляемые поля: paid_amount, remaining_amount
- [ ] `PaymentAdmin`:
  - [ ] list_display: жилец, сумма, дата, способ, статус, кто внёс
  - [ ] list_filter: payment_method, status, payment_date
- [ ] `AuditLogAdmin`:
  - [ ] list_display: timestamp, user, action, model_name, object_id
  - [ ] list_filter: action, model_name
  - [ ] readonly — все поля

**Критерий готовности:** Администрация может выполнять ВСЕ повседневные операции через Django Admin без обращения к API напрямую.

---

## Фаза 1.10 — API-документация

- [ ] Настроить drf-spectacular
- [ ] Добавить endpoint `/api/schema/` (OpenAPI JSON)
- [ ] Добавить endpoint `/api/docs/` (Swagger UI)
- [ ] Проверить: все endpoints отображаются в Swagger
- [ ] Проверить: описания полей корректны
- [ ] Проверить: примеры запросов работают

**Критерий готовности:** Swagger UI доступен, все endpoints документированы, можно тестировать API прямо из браузера.

---

## Фаза 1.11 — Тестирование

- [ ] Настроить pytest + pytest-django
- [ ] Создать `conftest.py` с общими fixtures
- [ ] Создать factories для всех моделей (factory-boy)
- [ ] Тесты `accounts`:
  - [ ] test_login_success
  - [ ] test_login_wrong_password
  - [ ] test_me_endpoint
  - [ ] test_role_permissions
- [ ] Тесты `inventory`:
  - [ ] test_create_building_floor_room
  - [ ] test_room_capacity_constraint
  - [ ] test_available_rooms_filter
- [ ] Тесты `residents`:
  - [ ] test_create_resident
  - [ ] test_university_id_unique_per_org
  - [ ] test_add_guardian
  - [ ] test_search_residents
- [ ] Тесты `occupancy`:
  - [ ] test_create_contract
  - [ ] test_assign_room_success
  - [ ] test_assign_full_room_fails
  - [ ] test_gender_policy_check
  - [ ] test_close_assignment_updates_occupancy
  - [ ] test_transfer_resident
  - [ ] test_terminate_contract_closes_assignments
- [ ] Тесты `billing`:
  - [ ] test_create_tariff
  - [ ] test_generate_charges
  - [ ] test_duplicate_charge_fails
  - [ ] test_record_payment_allocates_to_oldest
  - [ ] test_partial_payment
  - [ ] test_full_payment_changes_status
  - [ ] test_resident_balance
  - [ ] test_debtors_list
- [ ] Тесты `audit`:
  - [ ] test_audit_log_created_on_assignment
  - [ ] test_audit_log_created_on_payment
  - [ ] test_audit_log_readonly
- [ ] Тесты permissions:
  - [ ] test_dorm_manager_can_create_resident
  - [ ] test_accountant_cannot_create_resident
  - [ ] test_security_can_only_read
  - [ ] test_org_scope_isolation (не видит чужие данные)

**Критерий готовности:** Все тесты проходят. Покрытие бизнес-логики (services.py) ≥ 80%.

---

## Фаза 1.12 — Удаление старого кода

- [ ] Убедиться, что все тесты проходят на новых модулях
- [ ] Удалить `main/` app полностью
- [ ] Удалить `main` из `INSTALLED_APPS`
- [ ] Удалить старые миграции `main/`
- [ ] Проверить: проект запускается и работает без `main`
- [ ] Обновить корневые `urls.py` (убрать include main.urls)

**Критерий готовности:** Проект работает полностью на новых модулях. Старый код удалён.

---

## Фаза 1.13 — Деплой Этапа 1

- [ ] Настроить PostgreSQL на сервере
- [ ] Настроить `.env` на сервере (production переменные)
- [ ] Установить `DJANGO_SETTINGS_MODULE=config.settings.production`
- [ ] Запустить миграции на production
- [ ] Запустить `setup_initial_data` (роли, организация, админ)
- [ ] Настроить Gunicorn (3 workers)
- [ ] Настроить HTTPS
- [ ] Настроить CORS для фронтенда
- [ ] Проверить: Django Admin доступен и работает
- [ ] Проверить: API endpoints работают
- [ ] Проверить: Swagger UI доступен

**Критерий готовности:** Администрация университета может зайти, создать корпуса/комнаты, зарегистрировать жильцов, заселить их, вносить оплаты и смотреть отчёты.

---

# ✅ КОНТРОЛЬНАЯ ТОЧКА: ЭТАП 1 ЗАВЕРШЁН

> Проверка: все пункты выше отмечены `[x]`
> Система полностью заменяет бумажный учёт
> Администрация работает через Django Admin и/или API

---

# ЭТАП 2: Мобильное приложение для студентов

> Цель: студенты видят свои данные, свободные комнаты, могут подать заявку.

---

## Фаза 2.1 — Роль студента

### 2.1.1 Расширение `accounts`

- [ ] Добавить роль `student` в `Role.RoleName` choices
- [ ] Добавить роль в management command `create_initial_roles`
- [ ] Создать модель `StudentAccount` в `accounts/models.py`
  - [ ] Поля: user (OneToOne → User), resident (OneToOne → Resident), is_verified, verified_at, verified_by
- [ ] Создать и применить миграции
- [ ] Создать `accounts/serializers.py`:
  - [ ] `StudentRegistrationSerializer` (university_id, phone_number, email, password)
  - [ ] `StudentVerificationSerializer` (admin подтверждает аккаунт)
- [ ] Создать `accounts/services.py`:
  - [ ] `StudentAccountService.register(university_id, phone, email, password)`
    - [ ] Найти Resident по university_id + phone
    - [ ] Создать User с ролью student
    - [ ] Создать StudentAccount (is_verified=False)
  - [ ] `StudentAccountService.verify(student_account, admin_user)`
    - [ ] Установить is_verified=True, verified_at, verified_by
- [ ] Создать views:
  - [ ] `StudentRegistrationView` (POST /api/v1/auth/student/register/) — public
  - [ ] `StudentVerificationView` (POST /api/v1/auth/student/verify/) — admin only
- [ ] Создать permission `IsVerifiedStudent`
  - [ ] Проверяет: роль student + is_verified=True

**Критерий готовности:**
1. Студент может зарегистрироваться по student_id + телефон
2. Без верификации — доступ запрещён (403)
3. Админ верифицирует → студент получает доступ

### 2.1.2 Student API (только чтение своих данных)

- [ ] Создать `StudentProfileView` (GET /api/v1/student/profile/) — свой Resident
- [ ] Создать `StudentRoomView` (GET /api/v1/student/room/) — своя текущая комната
- [ ] Создать `StudentContractView` (GET /api/v1/student/contract/) — свой договор
- [ ] Создать `StudentChargesView` (GET /api/v1/student/charges/) — свои начисления
- [ ] Создать `StudentPaymentsView` (GET /api/v1/student/payments/) — свои оплаты
- [ ] Создать `StudentBalanceView` (GET /api/v1/student/balance/) — свой долг
- [ ] Все views: permission = IsVerifiedStudent, queryset фильтруется по request.user.student_account.resident

**Критерий готовности:** Студент видит ТОЛЬКО свои данные. Чужие данные недоступны (404 или 403).

---

## Фаза 2.2 — Бронирование комнат

### 2.2.1 Модель и логика бронирования

- [ ] Создать модель `RoomBookingRequest` (в `occupancy/` или отдельный app)
  - [ ] Поля: id (UUID), resident (FK), room (FK), status (pending/approved/rejected/cancelled), requested_at, reviewed_by (FK → User), reviewed_at, rejection_reason
- [ ] Создать и применить миграции
- [ ] Создать `BookingService`:
  - [ ] `BookingService.create_request(resident, room)`
    - [ ] Проверка: нет активной заявки (pending)
    - [ ] Проверка: в комнате есть место
    - [ ] Создание заявки
  - [ ] `BookingService.approve(booking_request, admin_user)`
    - [ ] Обновить статус → approved
    - [ ] Создать RoomAssignment (через RoomAssignmentService)
    - [ ] Отправить уведомление студенту
  - [ ] `BookingService.reject(booking_request, reason, admin_user)`
    - [ ] Обновить статус → rejected
    - [ ] Отправить уведомление студенту
  - [ ] `BookingService.cancel(booking_request)`
    - [ ] Только если status=pending
  - [ ] `BookingService.auto_cancel_expired()`
    - [ ] Отменить заявки на комнаты, которые заполнились

### 2.2.2 API бронирования

- [ ] Student endpoints:
  - [ ] POST `/api/v1/student/booking-requests/` — подать заявку
  - [ ] GET `/api/v1/student/booking-requests/` — мои заявки
  - [ ] DELETE `/api/v1/student/booking-requests/{id}/` — отменить заявку
- [ ] Admin endpoints:
  - [ ] GET `/api/v1/booking-requests/` — все заявки (dorm_manager)
  - [ ] POST `/api/v1/booking-requests/{id}/approve/` — одобрить
  - [ ] POST `/api/v1/booking-requests/{id}/reject/` — отклонить
- [ ] Открыть `/api/v1/rooms/available/` для роли student (read-only)

**Критерий готовности:**
1. Студент видит свободные комнаты
2. Студент подаёт заявку → статус pending
3. Комендант одобряет → жилец заселяется автоматически
4. Комендант отклоняет → студент получает уведомление
5. Нельзя подать две заявки одновременно

---

## Фаза 2.3 — Уведомления

### 2.3.1 Модуль `notifications`

- [ ] Создать приложение `apps/notifications/`
- [ ] Создать модель `Notification`
  - [ ] Поля: id (UUID), recipient (FK → User), type (payment_reminder/booking_approved/booking_rejected/eviction_warning/general), title, message, is_read, created_at
- [ ] Зарегистрировать в `INSTALLED_APPS`
- [ ] Создать и применить миграции
- [ ] Создать `notifications/services.py`
  - [ ] `NotificationService.send(recipient, type, title, message)`
  - [ ] `NotificationService.mark_as_read(notification_id, user)`
  - [ ] `NotificationService.get_unread_count(user)`
- [ ] Создать views:
  - [ ] GET `/api/v1/student/notifications/` — список уведомлений
  - [ ] PATCH `/api/v1/student/notifications/{id}/read/` — отметить прочитанным
  - [ ] GET `/api/v1/student/notifications/unread-count/` — количество непрочитанных

### 2.3.2 Автоматические уведомления

- [ ] Установить Celery + Redis
- [ ] Настроить `docker-compose.yml` (добавить redis, celery worker)
- [ ] Создать `notifications/tasks.py`:
  - [ ] `send_payment_reminders()` — за 5 дней до due_date
  - [ ] `send_overdue_notifications()` — при просрочке
  - [ ] `send_contract_expiry_reminders()` — за 30 дней до end_date
- [ ] Настроить Celery Beat (периодические задачи):
  - [ ] Ежедневно: check overdue charges
  - [ ] Ежедневно: payment reminders
  - [ ] Еженедельно: contract expiry reminders
- [ ] Интегрировать уведомления в существующие сервисы:
  - [ ] Booking approved → уведомление студенту
  - [ ] Booking rejected → уведомление студенту
  - [ ] Payment recorded → уведомление студенту
  - [ ] New booking request → уведомление коменданту

**Критерий готовности:**
1. Студент получает уведомления о приближении оплаты
2. Студент получает уведомления при одобрении/отклонении заявки
3. Уведомления можно отметить как прочитанные
4. Celery задачи работают по расписанию

---

## Фаза 2.4 — Тестирование Этапа 2

- [ ] Тесты регистрации студента
- [ ] Тесты верификации
- [ ] Тесты: студент видит только свои данные
- [ ] Тесты: студент НЕ видит чужие данные
- [ ] Тесты бронирования (создание, одобрение, отклонение, отмена)
- [ ] Тесты уведомлений (создание, mark_as_read)
- [ ] Тесты permission: студент не может изменять данные
- [ ] Нагрузочные тесты: 500 студентов одновременно просматривают комнаты

**Критерий готовности:** Все тесты проходят. Студенческий API безопасен — нет утечки данных.

---

## Фаза 2.5 — Мобильное приложение (фронтенд)

> Это отдельный проект, но бэкенд должен быть готов.

- [ ] API полностью задокументирован в Swagger
- [ ] CORS настроен для мобильного приложения
- [ ] Все student endpoints протестированы вручную через Swagger/Postman
- [ ] Подготовить Postman-коллекцию для мобильного разработчика
- [ ] Определить технологию мобильного приложения (Flutter / React Native)
- [ ] Передать документацию мобильному разработчику

**Критерий готовности:** Мобильный разработчик может начать работу, имея полную документацию и рабочий API.

---

# ✅ КОНТРОЛЬНАЯ ТОЧКА: ЭТАП 2 ЗАВЕРШЁН

> Студенты могут зайти в приложение, увидеть свои данные, подать заявку на комнату
> Администрация рассматривает заявки через панель
> Уведомления работают автоматически

---

# ЭТАП 3: Платёжная система

> Цель: студенты платят за общежитие онлайн через Payme / Click.

---

## Фаза 3.1 — Абстракция платёжного провайдера

### 3.1.1 Модуль `payments`

- [ ] Создать приложение `apps/payments/`
- [ ] Создать `payments/providers/base.py`
  - [ ] Абстрактный класс `BasePaymentProvider`:
    - [ ] `initiate_payment(amount, order_id, return_url)` → redirect_url
    - [ ] `verify_callback(request_data)` → transaction_result
    - [ ] `check_status(transaction_id)` → status
    - [ ] `refund(transaction_id, amount)` → result
- [ ] Создать модель `PaymentProvider`
  - [ ] Поля: id (UUID), name, code (payme/click), is_active, config (JSONField, encrypted), organization (FK)
- [ ] Создать модель `OnlinePaymentTransaction`
  - [ ] Поля: id (UUID), resident (FK), provider (FK), amount, currency (UZS), status (initiated/processing/completed/failed/refunded), provider_transaction_id, provider_response (JSON), initiated_at, completed_at, error_message, payment (FK → billing.Payment, null)
- [ ] Создать модель `PaymentReceipt`
  - [ ] Поля: id (UUID), payment (OneToOne → billing.Payment), receipt_number, receipt_data (JSON), issued_at, file (PDF)
- [ ] Зарегистрировать в `INSTALLED_APPS`
- [ ] Создать и применить миграции

**Критерий готовности:** Модели созданы, абстрактный провайдер определён.

---

## Фаза 3.2 — Интеграция Payme

- [ ] Создать `payments/providers/payme.py`
  - [ ] Класс `PaymeProvider(BasePaymentProvider)`
  - [ ] Реализовать `initiate_payment()`
    - [ ] Создать чек в Payme Merchant API
    - [ ] Вернуть URL для оплаты
  - [ ] Реализовать `verify_callback()` — обработка Payme webhook
    - [ ] CheckPerformTransaction
    - [ ] CreateTransaction
    - [ ] PerformTransaction
    - [ ] CancelTransaction
    - [ ] CheckTransaction
  - [ ] Реализовать `check_status()` — проверка статуса транзакции
  - [ ] Реализовать `refund()` — отмена/возврат
- [ ] Создать `payments/webhooks.py`
  - [ ] `PaymeWebhookView` (POST /api/v1/webhooks/payme/)
    - [ ] Валидация подписи
    - [ ] Маршрутизация по методу (CheckPerform, Create, Perform, Cancel)
    - [ ] Идемпотентность (повторный вызов не создаёт дубли)
    - [ ] Логирование всех вызовов
- [ ] Написать тесты для Payme:
  - [ ] test_initiate_payment
  - [ ] test_webhook_check_perform
  - [ ] test_webhook_create_transaction
  - [ ] test_webhook_perform_transaction (успех → Payment создан)
  - [ ] test_webhook_cancel_transaction
  - [ ] test_webhook_invalid_signature (отклонён)
  - [ ] test_idempotency (повторный вызов)

**Критерий готовности:** Полный цикл: инициация → оплата через Payme → webhook → Payment создан → Charge оплачен.

---

## Фаза 3.3 — Интеграция Click

- [ ] Создать `payments/providers/click.py`
  - [ ] Класс `ClickProvider(BasePaymentProvider)`
  - [ ] Реализовать `initiate_payment()` (Click Merchant API)
  - [ ] Реализовать `verify_callback()` (Click webhook)
    - [ ] Prepare
    - [ ] Complete
  - [ ] Реализовать `check_status()`
  - [ ] Реализовать `refund()`
- [ ] Создать `ClickWebhookView` (POST /api/v1/webhooks/click/)
  - [ ] Валидация
  - [ ] Идемпотентность
  - [ ] Логирование
- [ ] Тесты для Click (аналогично Payme)

**Критерий готовности:** Полный цикл через Click работает аналогично Payme.

---

## Фаза 3.4 — Сервис онлайн-оплаты

- [ ] Создать `payments/services.py`
  - [ ] `OnlinePaymentService.initiate(resident, charge_ids, provider_code)`
    - [ ] Создать OnlinePaymentTransaction → status: initiated
    - [ ] Вызвать provider.initiate_payment()
    - [ ] Вернуть redirect URL
  - [ ] `OnlinePaymentService.handle_success(transaction)`
    - [ ] Обновить transaction → status: completed
    - [ ] Создать billing.Payment → method: online
    - [ ] Создать PaymentAllocations (через BillingService)
    - [ ] Создать PaymentReceipt
    - [ ] Отправить уведомление студенту
    - [ ] Аудит-лог
  - [ ] `OnlinePaymentService.handle_failure(transaction, error)`
    - [ ] Обновить transaction → status: failed
    - [ ] Отправить уведомление студенту
  - [ ] `OnlinePaymentService.refund(transaction, user)`
    - [ ] Вызвать provider.refund()
    - [ ] Отменить Payment
    - [ ] Откатить PaymentAllocations
    - [ ] Обновить статусы Charge
    - [ ] Аудит-лог

**Критерий готовности:** Единый сервис работает с любым провайдером через абстракцию.

---

## Фаза 3.5 — Student Payment API

- [ ] POST `/api/v1/student/payments/initiate/`
  - [ ] Body: { charge_ids: [...], provider: "payme" }
  - [ ] Response: { transaction_id, redirect_url }
- [ ] GET `/api/v1/student/payments/{id}/status/`
  - [ ] Response: { status, amount, provider }
- [ ] GET `/api/v1/student/receipts/`
  - [ ] Список чеков
- [ ] GET `/api/v1/student/receipts/{id}/download/`
  - [ ] PDF чек

**Критерий готовности:** Студент может выбрать начисления → выбрать провайдер → оплатить → получить чек.

---

## Фаза 3.6 — Admin Payment Management

- [ ] GET `/api/v1/transactions/` — все онлайн-транзакции (фильтр по статусу, дате, провайдеру)
- [ ] GET `/api/v1/transactions/{id}/` — детали транзакции
- [ ] POST `/api/v1/transactions/{id}/refund/` — возврат платежа (university_admin)
- [ ] Настроить Django Admin для OnlinePaymentTransaction
  - [ ] list_display: жилец, сумма, провайдер, статус, дата
  - [ ] list_filter: status, provider, initiated_at
  - [ ] readonly — все поля (транзакции нельзя редактировать вручную)

**Критерий готовности:** Администрация видит все транзакции и может сделать возврат.

---

## Фаза 3.7 — Сверка платежей

- [ ] Создать модель `PaymentReconciliation`
  - [ ] Поля: provider, period, total_transactions, total_amount, matched, mismatched, status, report (JSON)
- [ ] Создать `ReconciliationService`:
  - [ ] `ReconciliationService.run(provider, date_from, date_to)`
    - [ ] Запросить транзакции у провайдера за период
    - [ ] Сравнить с локальными данными
    - [ ] Записать результат
    - [ ] При расхождении — уведомить бухгалтера
- [ ] Создать Celery task: `run_daily_reconciliation`
- [ ] API endpoints:
  - [ ] GET `/api/v1/reconciliation/` — список сверок
  - [ ] POST `/api/v1/reconciliation/run/` — запустить сверку вручную

**Критерий готовности:** Ежедневная автоматическая сверка. Бухгалтер видит расхождения.

---

## Фаза 3.8 — Расширенные финансовые отчёты

- [ ] Добавить в `reports/services.py`:
  - [ ] `ReportService.daily_transactions_report(organization, date)`
  - [ ] `ReportService.provider_breakdown_report(organization, date_range)`
  - [ ] `ReportService.reconciliation_report(organization, date_range)`
  - [ ] `ReportService.full_financial_report(organization, date_range)` — наличные + переводы + онлайн
  - [ ] `ReportService.refunds_report(organization, date_range)`
- [ ] Добавить API endpoints:
  - [ ] GET `/api/v1/reports/transactions/`
  - [ ] GET `/api/v1/reports/providers/`
  - [ ] GET `/api/v1/reports/financial/` (расширенный)
  - [ ] GET `/api/v1/reports/refunds/`

**Критерий готовности:** Бухгалтер видит полную финансовую картину: наличные + банковские + онлайн.

---

## Фаза 3.9 — Тестирование Этапа 3

- [ ] Unit-тесты PaymeProvider (mock HTTP)
- [ ] Unit-тесты ClickProvider (mock HTTP)
- [ ] Unit-тесты OnlinePaymentService
- [ ] Integration-тесты webhook обработки
- [ ] Тесты идемпотентности (повторный webhook)
- [ ] Тесты refund
- [ ] Тесты reconciliation
- [ ] E2E тесты: полный цикл от инициации до чека
- [ ] Тесты безопасности:
  - [ ] webhook без валидной подписи → отклонён
  - [ ] Студент не может оплатить чужие начисления
  - [ ] Refund только для admin

**Критерий готовности:** Все тесты проходят. Платёжная система стабильна и безопасна.

---

## Фаза 3.10 — Деплой Этапа 3

- [ ] Настроить production переменные для Payme (merchant_id, secret_key)
- [ ] Настроить production переменные для Click
- [ ] Настроить webhook URLs в личных кабинетах Payme и Click
- [ ] Настроить Redis на production (для Celery)
- [ ] Настроить Celery worker и Celery Beat на production
- [ ] Провести тестовые платежи (sandbox/test mode)
- [ ] Провести тестовые платежи (реальные, малые суммы)
- [ ] Включить production режим
- [ ] Мониторинг: настроить алерты на failed transactions

**Критерий готовности:** Реальные студенты могут платить через Payme и Click. Деньги приходят.

---

# ✅ КОНТРОЛЬНАЯ ТОЧКА: ЭТАП 3 ЗАВЕРШЁН

> Студенты платят онлайн через мобильное приложение
> Платежи автоматически распределяются по начислениям
> Бухгалтер видит полную картину в отчётах
> Сверка работает ежедневно

---

# Общая сводка

| Этап | Фаз | Пунктов | Ключевой результат |
|------|-----|---------|-------------------|
| 1 | 13 | ~180 | Администрация работает без бумаг |
| 2 | 5 | ~60 | Студенты видят свои данные и бронируют |
| 3 | 10 | ~80 | Студенты платят онлайн |
| **Итого** | **28** | **~320** | **Полная платформа** |
