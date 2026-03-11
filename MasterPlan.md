# Dormitory — Мастер-план реализации

> Единый план. Все задачи в одном файле в правильном порядке выполнения.
> Дата: 2026-03-11
> Разработчик: 1 fullstack (бэкенд + фронтенд)
> Стек: Django + React + Flutter

---

## Порядок работы

```
┌─────────────────────────────────────────────────┐
│  БЛОК 1: Бэкенд (Этап 1)                       │
│  Django REST API — полностью готовый API         │
│  ~5 недель                                      │
├─────────────────────────────────────────────────┤
│  БЛОК 2: Веб-панель (Этап 1)                    │
│  React — админ-панель для сотрудников            │
│  ~5 недель                                      │
├─────────────────────────────────────────────────┤
│  БЛОК 3: Бэкенд (Этап 2)                       │
│  Student API, бронирование, уведомления          │
│  ~2 недели                                      │
├─────────────────────────────────────────────────┤
│  БЛОК 4: Мобильное приложение + Веб (Этап 2)   │
│  Flutter (студенты) + React (обновления)         │
│  ~4 недели                                      │
├─────────────────────────────────────────────────┤
│  БЛОК 5: Платёжная система (Этап 3)             │
│  Бэкенд + Flutter + React                       │
│  ~4 недели                                      │
└─────────────────────────────────────────────────┘
Итого: ~20 недель
```

---

## Как пользоваться

- `[ ]` — не начато
- `[~]` — в работе
- `[x]` — завершено
- Каждая фаза имеет **критерий готовности** — без него нельзя идти дальше

---

# БЛОК 1: Бэкенд (Этап 1)

> Цель: полностью рабочий REST API. Все endpoints, вся бизнес-логика.
> Пока бэкенд не готов — Django Admin как временный UI.

---

## Фаза 1 — Фундамент проекта

### 1.1 Новая структура

- [ ] Создать `config/settings/base.py`, `local.py`, `production.py`, `test.py`
- [ ] Создать `config/urls.py`, `wsgi.py`, `asgi.py`
- [ ] Создать `apps/` директорию
- [ ] Создать `common/` директорию
- [ ] Обновить `manage.py` → `config.settings.local`
- [ ] Обновить `Procfile` → `config.wsgi:application`

**Готово когда:** `python manage.py runserver` работает с новой структурой.

### 1.2 Окружение и безопасность

- [ ] Установить `django-environ`
- [ ] Создать `.env.example` и `.env`
- [ ] Вынести SECRET_KEY, DATABASE_URL, DEBUG, ALLOWED_HOSTS в `.env`
- [ ] Создать `.gitignore` (db.sqlite3, .env, __pycache__, media/, staticfiles/)
- [ ] Удалить чувствительные файлы из git

**Готово когда:** Никаких секретов в коде. `.env` в `.gitignore`.

### 1.3 Зависимости

- [ ] Создать `requirements/base.txt` (Django, DRF, SimpleJWT, django-filter, drf-spectacular, django-cors-headers, django-environ, Pillow, psycopg2-binary)
- [ ] Создать `requirements/local.txt` (django-extensions, pytest, pytest-django, factory-boy)
- [ ] Создать `requirements/production.txt` (gunicorn, whitenoise)
- [ ] Удалить старый `requirements.txt`

**Готово когда:** `pip install -r requirements/local.txt` без ошибок.

### 1.4 Общие компоненты

- [ ] `common/mixins.py` — TimestampMixin (created_at, updated_at)
- [ ] `common/pagination.py` — StandardPagination (page_size=20, max=100)
- [ ] `common/exceptions.py` — единый формат ошибок `{error: {code, message, details}}`
- [ ] `common/permissions.py` — RoleBasedPermission (базовый класс)
- [ ] `common/validators.py` — валидатор телефона
- [ ] Настроить REST_FRAMEWORK в base.py (пагинация, фильтрация, поиск, сортировка, exceptions, schema)
- [ ] Настроить SIMPLE_JWT (access=30мин, refresh=7дней)
- [ ] Настроить SPECTACULAR_SETTINGS

**Готово когда:** Все импорты из `common/` работают.

### 1.5 Docker (рекомендуется)

- [ ] `docker/Dockerfile.dev`
- [ ] `docker-compose.yml` (Django + PostgreSQL)
- [ ] Проверить `docker-compose up`

**Готово когда:** Одна команда поднимает проект с PostgreSQL.

---

## Фаза 2 — Учётные записи

### 2.1 Модуль `accounts`

- [ ] Создать `apps/accounts/`
- [ ] Модель `Role` — choices: platform_admin, university_admin, dorm_manager, accountant, security_staff
- [ ] Модель `User` (AbstractUser) — id(UUID), email(unique, логин), full_name, role(FK), organization(FK), phone, is_active
- [ ] `AUTH_USER_MODEL = 'accounts.User'` в base.py
- [ ] Миграции
- [ ] Сериализаторы: UserReadSerializer, UserCreateSerializer, LoginSerializer, MeSerializer
- [ ] Сервис: AuthService.login(), AuthService.create_user()
- [ ] Views: LoginView, RefreshView, MeView, UserViewSet
- [ ] URLs
- [ ] Permissions: IsPlatformAdmin, IsUniversityAdmin, IsDormManager, IsAccountant, IsSecurityStaff
- [ ] Admin: User, Role
- [ ] Management command: `create_initial_roles`
- [ ] Management command: `create_superadmin`

**Готово когда:** POST /api/v1/auth/login/ → JWT. GET /api/v1/auth/me/ → текущий пользователь с ролью.

### 2.2 Модуль `organizations`

- [ ] Создать `apps/organizations/`
- [ ] Модель `Organization` — id(UUID), name, short_name, org_type, status, contact_email, contact_phone, address
- [ ] Миграции
- [ ] Сериализатор, сервис, views (CRUD), urls
- [ ] Admin
- [ ] Management command: `create_initial_organization`

**Готово когда:** CRUD организаций работает. Пользователи привязаны к организации.

### 2.3 Начальные данные

- [ ] Management command: `setup_initial_data` → создаёт роли + организацию + суперадмина

**Готово когда:** Одна команда делает проект готовым к работе.

---

## Фаза 3 — Инфраструктура общежития

### 3.1 Модуль `inventory`

- [ ] Создать `apps/inventory/`
- [ ] Модель `Building` — id(UUID), organization(FK), name, address, gender_policy, is_active
- [ ] Модель `Floor` — id(UUID), building(FK), number. Unique: (building, number)
- [ ] Модель `Room` — id(UUID), floor(FK), room_number, capacity, current_occupancy(default=0), gender_policy, status(available/full/maintenance/closed), monthly_price. Unique: (floor, room_number). Constraint: occupancy ≤ capacity
- [ ] Миграции
- [ ] Сериализаторы: BuildingList/Detail, FloorSerializer, RoomList/Detail/Write
- [ ] Сервис RoomService:
  - [ ] validate_capacity(room)
  - [ ] validate_gender_policy(room, resident)
  - [ ] increment_occupancy(room)
  - [ ] decrement_occupancy(room)
  - [ ] get_available_rooms(org, filters)
  - [ ] get_occupancy_stats(org)
- [ ] Views: BuildingViewSet, FloorViewSet, RoomViewSet + action `available`
- [ ] Фильтры: RoomFilter (building, floor, status, gender, has_places)
- [ ] URLs
- [ ] Admin: Building, Floor, Room (с вычисляемым available_places)

**Готово когда:** CRUD корпусов/этажей/комнат. `/api/v1/rooms/available/` с фильтрацией. Constraint не даёт переполнить комнату.

---

## Фаза 4 — Жильцы

### 4.1 Модуль `residents`

- [ ] Создать `apps/residents/`
- [ ] Модель `Resident` — id(UUID), organization(FK), full_name, birth_date, gender, phone, email, university_id, faculty, course, photo, status(active/evicted/graduated/suspended), notes. Unique: (organization, university_id)
- [ ] Модель `Guardian` — id(UUID), resident(**FK**, не OneToOne!), full_name, relationship, phone, address, is_emergency_contact
- [ ] Модель `ResidentDocument` — id(UUID), resident(FK), document_type, document_number, file
- [ ] Миграции
- [ ] Сериализаторы: ResidentList/Detail/Write, GuardianSerializer, DocumentSerializer
- [ ] Сервис ResidentService: create, update_status, get_current_room, search
- [ ] Views: ResidentViewSet, GuardianViewSet (nested), DocumentViewSet (nested)
- [ ] Фильтры: ResidentFilter (status, faculty, course, gender, search)
- [ ] URLs: /residents/, /residents/{id}/guardians/, /residents/{id}/documents/
- [ ] Admin: ResidentAdmin (inlines: Guardian, Document), search, filters

**Готово когда:** CRUD жильцов. Несколько опекунов. Загрузка документов. Поиск и фильтрация.

---

## Фаза 5 — Проживание

### 5.1 Модуль `occupancy`

- [ ] Создать `apps/occupancy/`
- [ ] Модель `AccommodationContract` — resident(FK), building(FK), contract_number(unique, auto), start_date, end_date, status(draft/active/expired/terminated), signed_at, terminated_at, termination_reason, created_by. Constraint: end > start
- [ ] Модель `RoomAssignment` — contract(FK), resident(FK), room(FK), start_date, end_date(null=живёт), status(active/completed/cancelled), assigned_by
- [ ] Модель `StayRecord` — resident(FK), check_in_at, check_out_at, reason(initial/return/transfer/eviction/graduation/leave), notes, recorded_by
- [ ] Миграции
- [ ] Сериализаторы: ContractList/Detail/Create/Terminate, AssignmentList/Create, TransferSerializer, StayRecordSerializer
- [ ] Сервис ContractService:
  - [ ] create_contract() — проверка: нет активного договора, автогенерация номера
  - [ ] terminate_contract() — закрыть все assignments, обновить статусы
- [ ] Сервис RoomAssignmentService:
  - [ ] assign_resident_to_room() — 4 проверки (нет активного, место есть, пол, договор) → создать assignment + обновить occupancy + создать StayRecord + аудит
  - [ ] close_assignment() → end_date, обновить occupancy, StayRecord
  - [ ] transfer_resident() → закрыть текущее + открыть новое + обновить обе комнаты
- [ ] Views: ContractViewSet (+ terminate action), AssignmentViewSet (+ close action), TransferView, StayRecordViewSet (read-only)
- [ ] Фильтры, URLs
- [ ] Admin

**Готово когда:**
- Цикл: договор → заселение → проживание → выселение
- При заселении room.current_occupancy +1, при выселении -1
- Перевод: старая -1, новая +1
- Полная комната → ошибка 400
- Неправильный пол → ошибка 400
- Нет договора → ошибка 400

---

## Фаза 6 — Финансы

### 6.1 Модуль `billing`

- [ ] Создать `apps/billing/`
- [ ] Модель `TariffPlan` — organization(FK), name, amount(decimal), billing_period, is_active
- [ ] Модель `Charge` — resident(FK), tariff_plan(FK), period_month, period_year, amount(decimal), status(pending/partially_paid/paid/overdue/cancelled), due_date, created_by. Unique: (resident, month, year). Properties: paid_amount, remaining_amount
- [ ] Модель `Payment` — resident(FK), amount(decimal), payment_date, payment_method(cash/bank_transfer), status(confirmed/pending/cancelled), receipt_number, notes, recorded_by
- [ ] Модель `PaymentAllocation` — payment(FK), charge(FK), amount(decimal). Unique: (payment, charge)
- [ ] Модель `Discount` — resident(FK), type(percentage/fixed), value, reason, start_date, end_date, is_active, approved_by
- [ ] Миграции
- [ ] Сериализаторы: TariffPlan, ChargeList/Detail/Generate, PaymentList/Create/Detail, ResidentBalance, Discount
- [ ] Сервис BillingService:
  - [ ] generate_monthly_charges(org, year, month) — для всех активных жильцов, пропуск дублей, применение скидок
  - [ ] record_payment(resident, amount, method) → создать Payment → автораспределение по старым начислениям → обновить статусы Charge
  - [ ] get_resident_balance(resident) → сумма долга
  - [ ] get_debtors(org) → список должников
  - [ ] mark_overdue_charges() → обновить просроченные
- [ ] Views: TariffPlanViewSet, ChargeViewSet (+ generate action), PaymentViewSet, ResidentBalanceView, DiscountViewSet
- [ ] Фильтры, URLs
- [ ] Admin: Charge (с paid_amount, remaining_amount), Payment, TariffPlan, Discount

**Готово когда:**
- Тарифы создаются. Начисления генерируются массово.
- Ручная оплата автоматически распределяется по начислениям.
- Баланс жильца считается правильно.
- Частичная оплата → partially_paid. Полная → paid.
- Дубль начисления → ошибка 400.

---

## Фаза 7 — Аудит

### 7.1 Модуль `audit`

- [ ] Создать `apps/audit/`
- [ ] Модель `AuditLog` — user(FK), action(create/update/delete), model_name, object_id, changes(JSON), ip_address, timestamp. Индексы: (model_name, object_id), (user, timestamp)
- [ ] `audit/middleware.py` — AuditMiddleware (захват user + IP)
- [ ] `audit/services.py` — AuditService.log(), AuditService.log_changes()
- [ ] Добавить middleware в base.py
- [ ] Миграции
- [ ] Views: AuditLogViewSet (только list + retrieve, только admin)
- [ ] Фильтры: action, model_name, user, дата
- [ ] Admin (readonly)
- [ ] Интегрировать в occupancy/services.py (заселение, выселение, перевод)
- [ ] Интегрировать в billing/services.py (оплаты, начисления)
- [ ] Интегрировать в residents/services.py (изменение статуса)

**Готово когда:** При заселении/оплате/выселении автоматически создаётся AuditLog. Записи нельзя редактировать.

---

## Фаза 8 — Отчёты

### 8.1 Модуль `reports`

- [ ] Создать `apps/reports/`
- [ ] ReportService:
  - [ ] occupancy_report(org) — корпус/этаж: вместимость, занято, свободно, %
  - [ ] available_rooms_report(org, filters) — свободные комнаты
  - [ ] debtors_report(org) — должники: ФИО, сумма, месяцев просрочки
  - [ ] payments_report(org, date_from, date_to) — оплаты за период
  - [ ] residents_report(org, filters) — список жильцов
  - [ ] summary_report(org) — всего жильцов, свободных мест, долг, собрано
- [ ] Views: 6 endpoint-ов (GET /api/v1/reports/...)
- [ ] URLs

**Готово когда:** Все 6 отчётов возвращают корректные данные.

---

## Фаза 9 — Документация и качество

### 9.1 API-документация

- [ ] Endpoint `/api/schema/` (OpenAPI JSON)
- [ ] Endpoint `/api/docs/` (Swagger UI)
- [ ] Проверить: все endpoints отображаются

### 9.2 Тесты

- [ ] Настроить pytest + pytest-django + conftest.py + factories
- [ ] accounts: login, permissions, roles
- [ ] inventory: CRUD, capacity constraint, available rooms
- [ ] residents: CRUD, unique university_id, guardians, search
- [ ] occupancy: assign (success + 3 ошибки), close, transfer, terminate
- [ ] billing: generate charges, record payment, allocation, balance, debtors
- [ ] audit: auto-logging, readonly
- [ ] permissions: каждая роль видит только своё

### 9.3 Очистка

- [ ] Удалить старый `main/` app полностью
- [ ] Удалить из INSTALLED_APPS и urls.py
- [ ] Проверить: всё работает без `main`

### 9.4 Деплой бэкенда

- [ ] PostgreSQL на сервере
- [ ] `.env` production
- [ ] Миграции на production
- [ ] `setup_initial_data`
- [ ] Gunicorn (3 workers)
- [ ] HTTPS
- [ ] Проверить API через Swagger

**Готово когда:** API работает на сервере. Swagger доступен. Все тесты проходят.

---

# ✅ КОНТРОЛЬНАЯ ТОЧКА: БЭКЕНД ЭТАПА 1 ГОТОВ

> API стабильный. Можно строить фронтенд.

---

# БЛОК 2: Веб-панель администрации (React)

> Цель: красивый UI для сотрудников университета вместо Django Admin.

---

## Фаза 10 — Инициализация React

### 10.1 Создание проекта

- [ ] `npm create vite@latest dormitory-admin -- --template react-ts`
- [ ] Установить: antd, @ant-design/icons, react-router-dom, axios, zustand, dayjs, recharts
- [ ] ESLint + Prettier
- [ ] `.env` с `VITE_API_URL`
- [ ] Отдельный git-репозиторий
- [ ] Структура папок: src/{api, store, pages, components, hooks, utils, types}

**Готово когда:** `npm run dev` запускает пустое приложение с Ant Design.

---

## Фаза 11 — Auth + Layout

### 11.1 HTTP-клиент

- [ ] `src/api/client.ts` — Axios instance
  - [ ] Request interceptor: Bearer token
  - [ ] Response interceptor: 401 → refresh → logout
  - [ ] Токены в localStorage
- [ ] `src/api/auth.ts` — login, refresh, getMe

### 11.2 Auth Store

- [ ] `src/store/authStore.ts` (Zustand) — user, tokens, isAuthenticated, login, logout

### 11.3 Логин

- [ ] `src/pages/Login/Login.tsx` — email + password, Ant Design Form, redirect после входа

### 11.4 Layout

- [ ] `src/components/Layout/AppLayout.tsx` — Sider + Header + Content
- [ ] Sidebar с меню:
  - [ ] Главная, Жильцы, Комнаты, Договоры, Финансы (подменю), Отчёты, Аудит, Пользователи
  - [ ] Пункты скрываются по роли
  - [ ] Сворачиваемый sidebar
- [ ] Header: имя, роль, выход

### 11.5 Роутинг

- [ ] `src/router.tsx` — все маршруты
- [ ] ProtectedRoute (redirect на /login)
- [ ] RoleRoute (403 если роль не та)
- [ ] Страницы: /login, /dashboard, /residents, /rooms, /contracts, /billing/*, /reports, /audit, /users

**Готово когда:** Логин работает. Layout с sidebar. Навигация между пустыми страницами.

---

## Фаза 12 — Dashboard

- [ ] 4 карточки метрик: жильцы, свободные места, задолженность, собрано за месяц
- [ ] Круговая диаграмма: занятость по корпусам (Recharts)
- [ ] Столбчатая диаграмма: оплаты за 6 месяцев
- [ ] Таблица: топ-10 должников
- [ ] Таблица: последние 10 оплат

**Готово когда:** Главная показывает реальные данные из API с графиками.

---

## Фаза 13 — CRUD страницы

### 13.1 Жильцы

- [ ] `ResidentList.tsx` — таблица (ФИО, статус, факультет, комната, телефон), пагинация, поиск, фильтры, кнопка "Добавить"
- [ ] `ResidentDetail.tsx` — вкладки: Анкета, Опекуны, Документы, Проживание, Финансы. Кнопки: Редактировать, Выселить, Перевести
- [ ] `ResidentForm.tsx` — Ant Design Form (ФИО, дата рождения, пол, телефон, email, студ.билет, факультет, курс, фото). Режим создания и редактирования

### 13.2 Комнаты

- [ ] `RoomList.tsx` — таблица (номер, этаж, корпус, вместимость, занято, свободно, статус, цена), цветовая индикация, фильтры
- [ ] `RoomDetail.tsx` — информация + список жильцов
- [ ] `RoomForm.tsx`
- [ ] `BuildingList.tsx` — CRUD корпусов
- [ ] `FloorList.tsx` — CRUD этажей внутри корпуса

### 13.3 Договоры и заселение

- [ ] `ContractList.tsx` — таблица, фильтры
- [ ] `ContractForm.tsx` — выбор жильца (Select с поиском), корпус, даты
- [ ] `AssignmentForm.tsx` — выбор жильца, комнаты (только свободные), договора
- [ ] `TransferModal.tsx` — текущая комната → новая, подтверждение

### 13.4 Финансы

- [ ] `ChargeList.tsx` — таблица (жилец, период, сумма, оплачено, остаток, статус), цветовая индикация, кнопка "Создать начисления за месяц" → модалка → generate
- [ ] `PaymentList.tsx` — таблица, кнопка "Внести оплату"
- [ ] `PaymentForm.tsx` — выбор жильца → показать долг → сумма, способ, дата → после сохранения показать распределение
- [ ] `TariffList.tsx` — CRUD тарифов
- [ ] `ResidentBalance.tsx` — компонент для вкладки "Финансы" в ResidentDetail: долг, начисления, оплаты, кнопка "Внести оплату"

**Готово когда:** Все CRUD через UI. Полный цикл: создать жильца → заселить → начислить → оплатить.

---

## Фаза 14 — Отчёты

- [ ] `OccupancyReport.tsx` — выбор корпуса, таблица этажей с прогресс-барами, итого
- [ ] `DebtorsReport.tsx` — таблица должников, сортировка по сумме
- [ ] `PaymentsReport.tsx` — выбор периода, таблица, итого
- [ ] `AvailableRoomsReport.tsx` — фильтр по корпусу/полу, таблица
- [ ] `ResidentsReport.tsx` — полный список с фильтрами

**Готово когда:** Все 5 отчётов с реальными данными.

---

## Фаза 15 — Аудит + Пользователи + Полировка

### 15.1 Аудит

- [ ] `AuditLog.tsx` — таблица (дата, пользователь, действие, модель), фильтры, модалка с деталями изменений

### 15.2 Пользователи

- [ ] `UserList.tsx` — таблица, кнопка "Добавить"
- [ ] `UserForm.tsx` — ФИО, email, пароль, роль, организация

### 15.3 Полировка

- [ ] Skeleton/Spinner при загрузке
- [ ] message.success / message.error уведомления
- [ ] Модалка подтверждения перед удалением
- [ ] Empty state на пустых таблицах
- [ ] Breadcrumbs
- [ ] 404 страница
- [ ] 403 страница
- [ ] Адаптивность (sidebar сворачивается, таблицы скроллятся)
- [ ] Favicon + заголовок

---

## Фаза 16 — Деплой веб-панели

- [ ] `npm run build` → `dist/`
- [ ] Деплой на Vercel / Nginx / Docker
- [ ] Настроить env для production (API URL)
- [ ] Настроить CORS на бэкенде
- [ ] Полная проверка: логин → все CRUD → отчёты

**Готово когда:** Веб-панель на production. Администрация может работать.

---

# ✅ КОНТРОЛЬНАЯ ТОЧКА: ВЕБ-ПАНЕЛЬ ГОТОВА

> Администрация работает через красивый React UI.
> Django Admin больше не нужен как основной интерфейс.

---

# БЛОК 3: Бэкенд Этапа 2

> Цель: API для студентов — регистрация, профиль, бронирование, уведомления.

---

## Фаза 17 — Роль студента

### 17.1 Расширение accounts

- [ ] Добавить `student` в Role choices
- [ ] Модель `StudentAccount` — user(OneToOne), resident(OneToOne), is_verified, verified_at, verified_by
- [ ] Миграции
- [ ] StudentRegistrationSerializer (university_id, phone, email, password)
- [ ] StudentVerificationSerializer
- [ ] StudentAccountService.register() — найти Resident по university_id + phone → создать User(role=student) → StudentAccount(verified=False)
- [ ] StudentAccountService.verify() → verified=True
- [ ] StudentRegistrationView (POST /api/v1/auth/student/register/) — public
- [ ] StudentVerificationView (POST /api/v1/auth/student/verify/) — admin only
- [ ] Permission: IsVerifiedStudent

**Готово когда:** Студент регистрируется → ждёт верификации → админ подтверждает → студент получает доступ.

---

## Фаза 18 — Student API

- [ ] GET /api/v1/student/profile/ — свой Resident
- [ ] GET /api/v1/student/room/ — своя комната + соседи (только имена)
- [ ] GET /api/v1/student/contract/ — свой договор
- [ ] GET /api/v1/student/charges/ — свои начисления
- [ ] GET /api/v1/student/payments/ — свои оплаты
- [ ] GET /api/v1/student/balance/ — свой долг
- [ ] Все views: IsVerifiedStudent, queryset = только свои данные
- [ ] Открыть /api/v1/rooms/available/ для student (read-only)

**Готово когда:** Студент видит ТОЛЬКО свои данные. Чужие — 404/403.

---

## Фаза 19 — Бронирование

- [ ] Модель `RoomBookingRequest` — resident(FK), room(FK), status(pending/approved/rejected/cancelled), requested_at, reviewed_by, reviewed_at, rejection_reason
- [ ] Миграции
- [ ] BookingService:
  - [ ] create_request() — проверка: нет pending заявки, есть место
  - [ ] approve() → создать RoomAssignment + уведомление
  - [ ] reject() → причина + уведомление
  - [ ] cancel() — только pending
  - [ ] auto_cancel_expired() — комната заполнилась
- [ ] Student endpoints:
  - [ ] POST /api/v1/student/booking-requests/
  - [ ] GET /api/v1/student/booking-requests/
  - [ ] DELETE /api/v1/student/booking-requests/{id}/
- [ ] Admin endpoints:
  - [ ] GET /api/v1/booking-requests/
  - [ ] POST /api/v1/booking-requests/{id}/approve/
  - [ ] POST /api/v1/booking-requests/{id}/reject/

**Готово когда:** Студент подаёт заявку → комендант одобряет/отклоняет → автоматическое заселение.

---

## Фаза 20 — Уведомления

- [ ] Создать `apps/notifications/`
- [ ] Модель `Notification` — recipient(FK→User), type, title, message, is_read, created_at
- [ ] NotificationService: send(), mark_as_read(), get_unread_count()
- [ ] Endpoints:
  - [ ] GET /api/v1/student/notifications/
  - [ ] PATCH /api/v1/student/notifications/{id}/read/
  - [ ] GET /api/v1/student/notifications/unread-count/
- [ ] Установить Celery + Redis
- [ ] docker-compose.yml: добавить redis, celery worker
- [ ] Celery tasks:
  - [ ] send_payment_reminders() — за 5 дней до due_date
  - [ ] send_overdue_notifications() — при просрочке
  - [ ] send_contract_expiry_reminders() — за 30 дней до end_date
- [ ] Celery Beat: ежедневные проверки
- [ ] Интеграция: booking approved/rejected → уведомление, payment recorded → уведомление

**Готово когда:** Уведомления создаются автоматически. Celery работает по расписанию.

---

## Фаза 21 — Тесты Этапа 2

- [ ] Регистрация студента
- [ ] Верификация
- [ ] Студент видит только свои данные
- [ ] Студент НЕ видит чужие данные
- [ ] Бронирование: создание, одобрение, отклонение, отмена
- [ ] Уведомления: создание, mark_as_read
- [ ] Permission: студент не может изменять данные

**Готово когда:** Все тесты проходят. Student API безопасен.

---

# ✅ КОНТРОЛЬНАЯ ТОЧКА: БЭКЕНД ЭТАПА 2 ГОТОВ

---

# БЛОК 4: Мобильное приложение + Обновление веба (Этап 2)

> Параллельно: Flutter для студентов + обновления React для админов.

---

## Фаза 22 — Flutter: инициализация

- [ ] `flutter create dormitory_app`
- [ ] Зависимости: dio, flutter_riverpod, go_router, flutter_secure_storage, cached_network_image, intl, flutter_local_notifications
- [ ] Структура: lib/{core/api, core/models, core/providers, features/*, widgets}
- [ ] Material 3 тема
- [ ] Отдельный git-репозиторий

**Готово когда:** `flutter run` запускает приложение.

---

## Фаза 23 — Flutter: авторизация

- [ ] `api_client.dart` — Dio + JWT interceptors + flutter_secure_storage
- [ ] `auth_provider.dart` (Riverpod) — login, register, logout, checkAuth
- [ ] `login_screen.dart` — email + пароль
- [ ] `register_screen.dart` — студ.билет + телефон + email + пароль → "Ожидайте подтверждения"
- [ ] `router.dart` — guards: не авторизован → login, не верифицирован → ожидание
- [ ] Экран ожидания верификации

**Готово когда:** Регистрация и логин работают. Неверифицированный видит экран ожидания.

---

## Фаза 24 — Flutter: основные экраны

### 24.1 Навигация

- [ ] `home_screen.dart` — Bottom Navigation (5 вкладок): Главная, Комната, Комнаты, Оплаты, Уведомления

### 24.2 Профиль

- [ ] `profile_screen.dart` — фото, ФИО, факультет, курс, студ.билет, телефон, баланс(долг красным), кнопка "Мой договор", кнопка "Выйти"

### 24.3 Моя комната

- [ ] `my_room_screen.dart` — номер, этаж, корпус, вместимость, соседи. Нет комнаты → "Посмотрите свободные"

### 24.4 Свободные комнаты + Бронирование

- [ ] `available_rooms_screen.dart` — карточки: номер, корпус, этаж, свободных мест, цена. Фильтры. Pull-to-refresh
- [ ] `room_detail_screen.dart` — детали + кнопка "Подать заявку"
- [ ] `booking_list_screen.dart` — мои заявки, статусы, отмена pending
- [ ] `booking_confirm_screen.dart` — подтверждение перед подачей

### 24.5 Финансы

- [ ] `balance_screen.dart` — общий долг (крупно), начисления, кнопка "Оплатить" (заблокирована до Этапа 3)
- [ ] `charges_screen.dart` — список начислений
- [ ] `payments_screen.dart` — история оплат

### 24.6 Уведомления

- [ ] `notifications_screen.dart` — список, непрочитанные выделены, свайп → прочитано, иконки по типу
- [ ] Badge непрочитанных на иконке в bottom nav

**Готово когда:** Студент видит профиль, комнату, подаёт заявку, видит баланс и уведомления.

---

## Фаза 25 — Flutter: push-уведомления

- [ ] Firebase Cloud Messaging
- [ ] FCM token → бэкенд при логине
- [ ] Foreground: snackbar
- [ ] Background: системное уведомление
- [ ] Tap: открыть нужный экран

**Готово когда:** Push-уведомления приходят на телефон.

---

## Фаза 26 — Flutter: полировка + публикация

### 26.1 Полировка

- [ ] Offline state: "Нет подключения"
- [ ] Pull-to-refresh везде
- [ ] Skeleton loading
- [ ] Splash screen
- [ ] App icon (Android + iOS)
- [ ] Error screens

### 26.2 Публикация

- [ ] Android: подписать → Google Play ($25) → скриншоты → описание → публикация
- [ ] Альтернатива: APK через QR-код / сайт университета
- [ ] iOS (опционально): Apple Developer ($99/год) → TestFlight → App Store

**Готово когда:** Студенты скачивают приложение.

---

## Фаза 27 — React: обновления для Этапа 2

- [ ] Страница "Заявки на бронирование":
  - [ ] Таблица: студент, комната, дата заявки, статус
  - [ ] Кнопки: Одобрить / Отклонить (с причиной)
  - [ ] Фильтры: статус, корпус, дата
- [ ] Страница "Верификация студентов":
  - [ ] Таблица: ФИО, студ.билет, телефон, дата регистрации
  - [ ] Кнопка: Подтвердить / Отклонить
- [ ] Обновить Dashboard:
  - [ ] Карточка: "Заявки на рассмотрении" (количество)
  - [ ] Карточка: "Неподтверждённые студенты" (количество)

**Готово когда:** Комендант управляет заявками и верификацией через веб-панель.

---

# ✅ КОНТРОЛЬНАЯ ТОЧКА: ЭТАП 2 ПОЛНОСТЬЮ ГОТОВ

> Студенты пользуются мобильным приложением.
> Администрация управляет заявками через веб-панель.

---

# БЛОК 5: Платёжная система (Этап 3)

> Бэкенд + Flutter + React одновременно.

---

## Фаза 28 — Бэкенд: платёжный модуль

- [ ] Создать `apps/payments/`
- [ ] `providers/base.py` — BasePaymentProvider (абстрактный: initiate, verify_callback, check_status, refund)
- [ ] Модель `PaymentProvider` — name, code, is_active, config(JSON encrypted), organization(FK)
- [ ] Модель `OnlinePaymentTransaction` — resident(FK), provider(FK), amount, currency, status(initiated/processing/completed/failed/refunded), provider_transaction_id, provider_response(JSON), initiated_at, completed_at, error_message, payment(FK→billing.Payment)
- [ ] Модель `PaymentReceipt` — payment(OneToOne), receipt_number, receipt_data(JSON), issued_at, file(PDF)
- [ ] Миграции

**Готово когда:** Модели и абстракция созданы.

---

## Фаза 29 — Бэкенд: Payme + Click

### 29.1 Payme

- [ ] `providers/payme.py` — PaymeProvider
- [ ] initiate_payment() → URL для оплаты
- [ ] verify_callback() → CheckPerform, Create, Perform, Cancel
- [ ] check_status()
- [ ] refund()
- [ ] `PaymeWebhookView` (POST /api/v1/webhooks/payme/) — валидация подписи, идемпотентность, логирование

### 29.2 Click

- [ ] `providers/click.py` — ClickProvider
- [ ] initiate_payment()
- [ ] verify_callback() → Prepare, Complete
- [ ] `ClickWebhookView` (POST /api/v1/webhooks/click/)

### 29.3 Сервис оплаты

- [ ] OnlinePaymentService:
  - [ ] initiate(resident, charge_ids, provider) → transaction + redirect URL
  - [ ] handle_success(transaction) → Payment + Allocations + Receipt + уведомление
  - [ ] handle_failure(transaction, error) → уведомление
  - [ ] refund(transaction) → отмена Payment, откат Allocations, обновление Charges

### 29.4 API

- [ ] POST /api/v1/student/payments/initiate/ → {transaction_id, redirect_url}
- [ ] GET /api/v1/student/payments/{id}/status/
- [ ] GET /api/v1/student/receipts/
- [ ] GET /api/v1/student/receipts/{id}/download/
- [ ] GET /api/v1/transactions/ (admin)
- [ ] POST /api/v1/transactions/{id}/refund/ (admin)

**Готово когда:** Полный цикл: инициация → провайдер → webhook → Payment → Charge оплачен → чек.

---

## Фаза 30 — Бэкенд: сверка + отчёты

- [ ] Модель `PaymentReconciliation` — provider, period, transactions, amount, matched, mismatched, status, report(JSON)
- [ ] ReconciliationService.run()
- [ ] Celery task: run_daily_reconciliation
- [ ] GET /api/v1/reconciliation/
- [ ] POST /api/v1/reconciliation/run/
- [ ] Расширенные отчёты: daily_transactions, provider_breakdown, full_financial, refunds

**Готово когда:** Ежедневная сверка. Бухгалтер видит расхождения.

---

## Фаза 31 — Бэкенд: тесты Этапа 3

- [ ] Unit: PaymeProvider (mock HTTP)
- [ ] Unit: ClickProvider (mock HTTP)
- [ ] Unit: OnlinePaymentService
- [ ] Integration: webhook обработка
- [ ] Идемпотентность (повторный webhook)
- [ ] Refund
- [ ] Безопасность: невалидная подпись → отклонён, чужие начисления → 403

**Готово когда:** Все тесты проходят. Платёжная система стабильна.

---

## Фаза 32 — Flutter: онлайн-оплата

- [ ] `payment_screen.dart` — список неоплаченных (чекбоксы), итого, кнопки Payme/Click
- [ ] `payment_webview_screen.dart` — WebView провайдера, обработка callback
- [ ] `payment_result_screen.dart` — успех (галочка + сумма + "Скачать чек") / неудача (повторить)
- [ ] `receipts_screen.dart` — список чеков, скачивание PDF
- [ ] Разблокировать кнопку "Оплатить" на balance_screen

**Готово когда:** Студент выбирает начисления → Payme/Click → оплачивает → чек.

---

## Фаза 33 — React: онлайн-оплата

- [ ] Dashboard: карточка "Онлайн-оплаты сегодня", график онлайн vs наличные
- [ ] `Transactions.tsx` — таблица транзакций, фильтры, кнопка "Возврат"
- [ ] `Reconciliation.tsx` — таблица сверок, кнопка "Запустить", детали
- [ ] Обновить отчёты: вкладка "Финансовый" (наличные + переводы + онлайн), вкладка "По провайдерам"

**Готово когда:** Бухгалтер видит онлайн-транзакции, возвраты, сверку.

---

## Фаза 34 — Деплой Этапа 3

- [ ] Production переменные: Payme (merchant_id, secret), Click (merchant_id, secret)
- [ ] Webhook URLs в кабинетах Payme и Click
- [ ] Redis на production для Celery
- [ ] Celery worker + Beat на production
- [ ] Тестовые платежи (sandbox)
- [ ] Тестовые платежи (реальные, малые суммы)
- [ ] Включить production
- [ ] Алерты на failed transactions

**Готово когда:** Реальные студенты платят. Деньги приходят.

---

# ✅ КОНТРОЛЬНАЯ ТОЧКА: ВСЯ СИСТЕМА ГОТОВА

---

# Итоговая сводка

| Блок | Фазы | Что делаем | Недель |
|------|------|-----------|--------|
| **1** | 1–9 | Бэкенд Этап 1 (API полностью) | ~5 |
| **2** | 10–16 | React веб-панель | ~5 |
| **3** | 17–21 | Бэкенд Этап 2 (student API) | ~2 |
| **4** | 22–27 | Flutter + React обновления | ~4 |
| **5** | 28–34 | Платёжная система (всё) | ~4 |
| | **34 фазы** | | **~20 недель** |

```
Месяц 1-2:  Рабочий API + Django Admin для администрации
Месяц 3:    Красивая веб-панель на React
Месяц 4:    Мобильное приложение для студентов
Месяц 5:    Онлайн-оплата Payme/Click
```
