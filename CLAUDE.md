# CLAUDE.md — Dormitory Platform

> Полная документация по коду, бизнес-логике, API и эксплуатации: **DOCUMENTATION.md** в корне. Читать её первой.

## Описание проекта

**EDormitory** — коммерческая платформа управления университетским общежитием.
Заменяет бумажный учёт (тетради, Excel) и автоматизирует работу администрации.

### Этапы развития

| Этап | Цель | Статус |
|------|------|--------|
| **1** | Административная веб-платформа | ГОТОВО |
| **1.5** | Мобильное приложение для админов (Flutter) | ГОТОВО |
| **1.7** | Мульти-университет + роль Министерства (read-only, сводка по всем вузам) | ГОТОВО (2026-09-06) |
| **1.8** | Движок правил заселения: окна доступа, ограничения по местам, очередь корпусов/этажей, брони | ГОТОВО, бэкенд + веб (2026-09-06) |
| **2** | Мобильное приложение для студентов (самобронирование на движке 1.8) | Не начат |
| **3** | Онлайн-оплата (Payme / Click) | Не начат |

---

## Деплой и инфраструктура

| Компонент | URL / Адрес |
|-----------|-------------|
| **Веб-приложение** | https://begimbaev-dormitory.uk |
| **API** | https://begimbaev-dormitory.uk/api/v1/ |
| **Сервер** | Oracle Cloud Always Free, VM.Standard.A1.Flex (1 OCPU ARM, 6GB RAM), регион Frankfurt |
| **IP** | 92.5.136.42 (ssh-алиас `oracle`, пользователь ubuntu, ключ ~/.ssh/oracle_dormitory.key) |
| **Старый сервер** | Hetzner 65.108.159.10 — выведен из эксплуатации 2026-09-02 |
| **ОС** | Ubuntu 24.04 |
| **Домен** | begimbaev-dormitory.uk (Cloudflare) |
| **SSL** | Cloudflare → Nginx (Full mode) |
| **DNS** | Cloudflare (Proxied) |
| **GitHub** | NawrizbekBegimbaev/Domitory_BackEnd |

### Сервисы на сервере

```bash
# Django backend (Gunicorn)
systemctl status dormitory

# Telegram bot (long-polling)
systemctl status dormitory-bot

# Nginx (frontend + reverse proxy)
systemctl status nginx
```

### Деплой обновлений

Сервер: Oracle Cloud (переезд с Hetzner 2026-09-02). Все скрипты в `deploy/oracle/`, подробности в `deploy/oracle/README.md`.

```bash
# Backend + Frontend одной командой (tar по ssh, миграции, collectstatic, рестарт сервисов)
bash deploy/oracle/deploy.sh oracle

# Любая manage.py-команда на сервере (всегда production-настройки + PostgreSQL)
ssh oracle "sudo /home/dormitory/manage.sh <command>"

# Логи
ssh oracle "sudo journalctl -u dormitory -f"
ssh oracle "sudo journalctl -u dormitory-bot -f"
```

**ВАЖНО:** на сервере manage.py по умолчанию берёт `config.settings.local` (SQLite). Никогда не запускать
`python manage.py` напрямую — только через `/home/dormitory/manage.sh`.

### Переменные окружения (сервер: /home/dormitory/backend/.env)

```
SECRET_KEY=<generated>
DEBUG=False
ALLOWED_HOSTS=begimbaev-dormitory.uk,www.begimbaev-dormitory.uk,92.5.136.42,localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://begimbaev-dormitory.uk,https://www.begimbaev-dormitory.uk
DATABASE_URL=postgres://dormitory:<password>@localhost:5432/dormitory
EMAIL_HOST_USER=begimbaev.dormitory@gmail.com
EMAIL_HOST_PASSWORD=<app_password>
DEFAULT_FROM_EMAIL=Dormitory <begimbaev.dormitory@gmail.com>
TELEGRAM_BOT_TOKEN=<token>
DJANGO_SETTINGS_MODULE=config.settings.production
SECURE_SSL_REDIRECT=False
```

---

## Технологический стек

| Компонент | Технология |
|-----------|-----------|
| Backend | Python 3.12+, Django 4.2 LTS, DRF 3.15+ |
| База данных | PostgreSQL 16+ |
| Аутентификация | SimpleJWT 5.3+ |
| Фильтрация | django-filter |
| API-документация | drf-spectacular (OpenAPI 3.0) |
| CORS | django-cors-headers |
| WSGI | Gunicorn |
| Статика | WhiteNoise |
| Telegram | requests + Bot API |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4 |
| Мобильное приложение | Flutter 3.41+, Dart 3.11+, Provider |
| Тесты | pytest, pytest-django, factory-boy, Playwright |
| i18n | Русский, Узбекский, Английский |

---

## Структура проекта

```
Domitory_BackEnd/
├── domitory/                    # Django backend
│   ├── config/settings/         # base.py, local.py, production.py, test.py
│   ├── apps/
│   │   ├── accounts/            # Пользователи, роли, JWT, Telegram OTP, password reset
│   │   ├── universities/        # Университеты (тенанты), сводка для Министерства
│   │   ├── admission/           # Правила заселения: кампании, окна, ограничения, очередь, брони
│   │   ├── organizations/       # (kept for migration history, URLs removed)
│   │   ├── inventory/           # Корпуса, этажи, комнаты
│   │   ├── residents/           # Жильцы, опекуны, документы, факультеты
│   │   ├── occupancy/           # Договоры, заселение, история, перевод
│   │   ├── billing/             # Начисления, оплаты, FIFO, авто-генерация
│   │   ├── reports/             # 6 отчётов
│   │   ├── audit/               # Аудит-лог
│   │   └── access_control/      # События входа/выхода (AccessEvent)
│   ├── domitory/, main/         # LEGACY первой версии (2024, Heroku) — не используется, удалить
│   ├── common/                  # Миксины, пагинация, ошибки, права, валидаторы, tenancy (изоляция по универу)
│   └── requirements/            # base.txt, local.txt, production.txt, test.txt
│
├── frontend/                    # React frontend
│   └── src/
│       ├── pages/               # 17 страниц (+ IncomePage, UniversitiesPage, AdmissionPage)
│       ├── components/          # Модалки, таблицы, формы
│       ├── api/                 # Axios клиент
│       └── i18n/                # ru.ts, uz.ts, en.ts
│
├── mobile_admin/                # Flutter мобильное приложение
│   └── lib/
│       ├── core/                # api.dart, theme.dart, auth_provider.dart
│       ├── screens/
│       │   ├── login/           # Email + Phone/OTP логин
│       │   ├── dashboard/       # Статистика, графики
│       │   ├── residents/       # Список, детали, добавление, редактирование
│       │   ├── rooms/           # Просмотр комнат
│       │   ├── buildings/       # CRUD корпусов, этажей, комнат
│       │   ├── contracts/       # Список, создание договоров
│       │   ├── finance/         # Платежи, новый платёж
│       │   ├── reports/         # 3 вкладки отчётов
│       │   ├── audit/           # Лог действий
│       │   ├── users/           # Список сотрудников
│       │   └── menu/            # Навигация + профиль
│       └── main.dart
│
├── deploy/oracle/               # Скрипты деплоя и инструкция по серверу
├── DOCUMENTATION.md             # Полная документация (источник правды)
├── qa/                          # QA тесты (API + E2E)
│   ├── conftest.py              # TEST_ENV=local|prod
│   ├── test_api.py              # 72 API теста
│   └── test_e2e.py              # 50 E2E тестов (Playwright)
│
├── .gitignore
└── CLAUDE.md
```

---

## Архитектурные принципы

### 1. Fat Services, Thin Views
- Вся бизнес-логика — в `services.py`
- Views: принять запрос → вызвать сервис → вернуть ответ

### 2. Multi-university (с 2026-09-06)
- Модель `universities.University`; FK `university` у Building, Resident, Faculty, User
- Все viewset'ы фильтруют по университету через `common/tenancy.py` (`UniversityScopedMixin`)
- `platform_admin` и `ministry` — глобальные роли без университета, видят всё, могут сузить `?university=<id>`
- `ministry` — только чтение (блокируется в `RoleBasedPermission` для любых не-SAFE методов)
- Онбординг: platform_admin создаёт только ministry-сотрудников и university_admin (в форме — выбор/создание университета); остальных сотрудников вуза добавляет university_admin. У User есть `passport_number`, `position`
- Поле студбилета в БД называется `student_number`, в API по-прежнему `university_id`

### 2a. Правила заселения (app `admission`)
- `AdmissionCampaign` (учебный год, активна одна на универ) → `BookingWindow` (когда кому открыто), `PlacementRule` (корпус/этаж/комната только для …), `BuildingOrder` (очередь корпусов и этажей), `Booking` (бронь с удержанием места)
- `EligibilityService.check(resident, room)` — единая проверка; `AdmissionGuard` вызывается из `RoomAssignmentService`
- university_admin+ может обойти правила с `override_reason` (пишется в аудит); комендант — нет
- Гражданство жильца: `Resident.citizenship` (ISO-2, по умолчанию UZ), `is_foreign` = не UZ

### 3. Авто-генерация начислений
- При назначении комнаты автоматически создаются Charge записи
- Цена берётся из `room.monthly_price`
- При переводе — пересчёт начислений
- При расторжении — возврат переплаты

### 4. FIFO оплата
- Платёж распределяется по начислениям от старых к новым
- PaymentAllocation отслеживает привязку

### 5. Audit everything critical
- Любое изменение финансовых данных, проживания, договоров — логируется

### 6. Уникальность данных
- `User.email` — unique
- `User.phone_number` — unique (null допустим)
- `User.telegram_id` — unique (null допустим)

---

## Роли и права

| Роль | Описание |
|------|----------|
| `platform_admin` | Полный доступ |
| `university_admin` | Администратор |
| `dorm_manager` | Комендант |
| `accountant` | Бухгалтер |
| `security_staff` | Только чтение |
| `ministry` | Министерство: только чтение, все университеты, `/reports/universities/` |

---

## API Endpoints

Префикс: `/api/v1/`

```
# Auth
POST   /auth/login/
POST   /auth/login/phone/              # OTP через Telegram
POST   /auth/login/phone/confirm/
POST   /auth/refresh/
GET    /auth/me/
POST   /auth/password-reset/
POST   /auth/password-reset/confirm/
GET    /auth/roles/

# Users
GET/POST        /users/                    # university_admin — свой универ; platform_admin передаёт university
GET/PUT/DELETE  /users/{id}/

# Universities
GET/POST        /universities/             # запись — только platform_admin
GET/PUT/DELETE  /universities/{id}/

# Admission (правила заселения)
GET/POST        /admission/campaigns/      # + /{id}/activate/, /active/
GET/POST        /admission/windows/?campaign=
GET/POST        /admission/rules/?campaign=
GET/POST        /admission/building-order/?campaign=
GET/POST        /admission/bookings/       # POST = бронь; /{id}/confirm/, /{id}/cancel/
GET             /admission/eligibility/?resident=&room=
GET             /admission/eligible-rooms/?resident=
GET             /admission/status/         # активная кампания + открытые окна (для студ. приложения)

# Verify (для создания пользователей)
POST   /auth/verify-email/send/
POST   /auth/verify-email/confirm/
POST   /auth/verify-phone/send/
POST   /auth/verify-phone/confirm/

# Inventory
GET/POST        /buildings/
GET/PUT/DELETE  /buildings/{id}/
GET/POST        /floors/
GET/PUT/DELETE  /floors/{id}/
GET/POST        /rooms/
GET/PUT/DELETE  /rooms/{id}/
GET             /rooms/available/

# Residents
GET/POST        /residents/
GET/PUT/DELETE  /residents/{id}/
GET/POST        /residents/{id}/guardians/
GET/POST        /residents/{id}/documents/
GET             /residents/{id}/balance/
POST            /residents/{id}/transfer/
POST            /residents/{id}/withdraw/

# Faculties
GET/POST        /faculties/

# Contracts & Assignments
GET/POST        /contracts/
GET/PUT         /contracts/{id}/
POST            /contracts/{id}/terminate/
GET/POST        /assignments/
POST            /assignments/full-room/      # покупка всей комнаты группой
GET/PUT         /assignments/{id}/
POST            /assignments/{id}/close/     # выселение
POST            /assignments/{id}/transfer/  # перевод
# POST /assignments/, /full-room/, /transfer/ принимают override_reason (university_admin+)
GET             /stay-records/

# Billing
GET/POST        /charges/
POST            /charges/generate/
GET/POST        /payments/

# Reports (глобальные роли могут передать ?university=)
GET             /reports/universities/     # сводка по всем универам (ministry, platform_admin)
GET             /reports/occupancy/
GET             /reports/available-rooms/
GET             /reports/debtors/
GET             /reports/payments/         # ?period=month|quarter|year
GET             /reports/residents/
GET             /reports/summary/

# Audit
GET             /audit/

# Access control (турникет; интеграции с оборудованием пока нет)
GET/POST        /access-events/
GET/PUT/DELETE  /access-events/{id}/

# Guardians / Documents (прямые CRUD, помимо вложенных под residents)
GET/POST        /guardians/
GET/POST        /documents/
```

---

## Тесты

```bash
# Backend unit тесты (203 теста)
cd domitory && py -3.13 -m pytest

# API тесты — локально (72 теста)
pytest qa/test_api.py -v

# API тесты — прод (учётка админа через env; на Windows: py -3.13 -m pytest)
TEST_ENV=prod QA_ADMIN_EMAIL=... QA_ADMIN_PASSWORD=... pytest qa/test_api.py -v

# E2E тесты — локально (50 тестов)
pytest qa/test_e2e.py -v --headed

# E2E тесты — прод
TEST_ENV=prod pytest qa/test_e2e.py -v

# Все QA тесты на проде
TEST_ENV=prod pytest qa/ -v
```

---

## Flutter мобильное приложение

### Сборка

```bash
# iOS (из ~/mobile_admin_build/ — вне iCloud!)
cd ~/mobile_admin_build
flutter build ios --release
xcrun devicectl device install app --device <UDID> build/ios/iphoneos/Runner.app

# Android
cd mobile_admin
flutter run -d <device_id>
```

**ВАЖНО:** iOS билд НЕЛЬЗЯ делать из `~/Documents/` — iCloud добавляет `com.apple.provenance` и codesign падает. Используй `~/mobile_admin_build/`.

### Синхронизация кода перед iOS билдом

```bash
rsync -av mobile_admin/lib/ ~/mobile_admin_build/lib/
```

### API URL
- Прод: `https://begimbaev-dormitory.uk/api/v1`
- Локал: `http://172.20.10.9:8000/api/v1`
- Настраивается в `lib/core/api.dart`

---

## Ключевая бизнес-логика

### Заселение
1. Создать Resident → 2. Guardian + Documents → 3. Contract → 4. RoomAssignment (авто-charges) → 5. StayRecord → 6. AuditLog

### Выселение
1. Terminate Contract → 2. Close Assignment → 3. Refund overpayment → 4. StayRecord → 5. AuditLog

### Перевод
1. Close old Assignment → 2. Create new Assignment → 3. Recalculate charges → 4. StayRecord

### Оплата (FIFO)
1. Create Payment → 2. Auto PaymentAllocation → 3. Update Charge statuses → 4. AuditLog

---

## Правила для Claude Code

1. Один app за раз — не переключайся между модулями
2. Тесты пишем сразу
3. При архитектурных решениях — спроси
4. Никаких секретов в коде, только через .env
5. iOS билд только из `~/mobile_admin_build/`
6. После изменений в mobile_admin/lib/ — синхронизировать в ~/mobile_admin_build/lib/
7. После бэкенд изменений — деплой: `bash deploy/oracle/deploy.sh oracle`
8. manage.py на сервере только через `/home/dormitory/manage.sh` (иначе SQLite вместо PostgreSQL)
9. При изменении логики или API — обновить DOCUMENTATION.md
