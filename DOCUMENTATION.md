# EDormitory — полная документация проекта

Актуально на 2026-09-02. Составлено по фактическому коду, а не по планам. Если код и этот документ расходятся, прав код, и документ надо поправить.

Содержание:

1. Что это и для кого
2. Инфраструктура и деплой
3. Архитектура backend
4. Модель данных
5. Роли и права
6. Аутентификация
7. Бизнес-логика (заселение, оплата, выселение, перевод)
8. API
9. Веб-интерфейс (React)
10. Мобильное приложение (Flutter)
11. Telegram-бот
12. Тесты
13. Эксплуатация: команды, cron, логи, бэкапы
14. Известные проблемы и технический долг
15. Что не сделано и планы

---

## 1. Что это и для кого

EDormitory — система учёта университетского общежития. Заменяет тетради и Excel у администрации: кто где живёт, по какому договору, сколько должен, кто заплатил.

Пользователи системы — сотрудники общежития (администратор, комендант, бухгалтер, охрана). Студенты сами в систему не заходят, это запланировано на этап 2.

Состоит из трёх частей, все ходят в один backend:

| Часть | Технология | Где живёт |
|-------|-----------|-----------|
| Backend API | Django 4.2 + DRF, PostgreSQL | `domitory/` |
| Веб-панель | React 19, Vite 8, TypeScript, Tailwind v4 | `frontend/` |
| Мобильное приложение для админов | Flutter 3.41, Provider | `mobile_admin/` |

Языки интерфейса: русский, узбекский, каракалпакский. Backend отдаёт данные на русском (verbose_name, переводы в аудите), переключение языка сделано на стороне веб-клиента.

Бренд: «EDormitory» с подписью «by Naurizbek». Ранее использовались логотип и название Ajou University, удалены 2026-09-02.

---

## 2. Инфраструктура и деплой

### 2.1. Продакшен

| Компонент | Значение |
|-----------|----------|
| Сайт и API | https://begimbaev-dormitory.uk, API под `/api/v1/`, Swagger под `/api/docs/` |
| Сервер | Oracle Cloud Always Free, VM.Standard.A1.Flex (ARM, 1 OCPU, 6 GB), Ubuntu 24.04, регион Frankfurt |
| IP | 92.5.136.42 |
| SSH | `ssh oracle` (алиас в `~/.ssh/config`, пользователь ubuntu, ключ `~/.ssh/oracle_dormitory.key`) |
| DNS и HTTPS | Cloudflare, режим SSL «Full». На сервере self-signed сертификат на 443 |
| База | PostgreSQL 16, локально на той же VM, база и пользователь `dormitory` |
| Процессы | systemd: `dormitory` (Gunicorn, 3 воркера, 127.0.0.1:8000), `dormitory-bot` (Telegram long-polling), `nginx` |
| Cron | `0 1 * * *` авто-выселение по истёкшим договорам |
| Старый сервер | Hetzner 65.108.159.10, выведен 2026-09-02, данные не переносились |

Раскладка на сервере:

```
/home/dormitory/
├── backend/          # код Django (копия domitory/), .env, media/, staticfiles/
├── frontend/         # собранный React (dist/)
├── venv/             # Python 3.12 virtualenv
├── manage.sh         # обёртка над manage.py с production-настройками
└── backups/          # ручные дампы
```

Nginx: `/` отдаёт React-сборку с fallback на index.html, `/api/`, `/admin/`, `/schema/` проксирует в Gunicorn, `/static/` и `/media/` отдаёт с диска.

### 2.2. Скрипты деплоя

Все в `deploy/oracle/`, подробная инструкция в `deploy/oracle/README.md`.

| Скрипт | Что делает |
|--------|-----------|
| `setup_server.sh` | Одноразовая настройка чистой VM: пакеты, iptables (Oracle блокирует 80/443 внутри VM), пользователь, PostgreSQL, venv, nginx, systemd, cron, self-signed cert |
| `deploy.sh oracle` | Обычный деплой: tar backend по ssh, сборка и заливка frontend, pip install, migrate, collectstatic, рестарт сервисов |
| `migrate_db.sh` | Перенос базы и media с одного сервера на другой через pg_dump |
| `manage.sh` | Копируется на сервер, единственный правильный способ запускать manage.py |

Секреты сервера лежат локально в `deploy/oracle/backups/` (папка в .gitignore): `.env`, `db_password.txt`, `admin_password.txt`.

### 2.3. Переменные окружения (`/home/dormitory/backend/.env`)

```
SECRET_KEY=                 # только буквы и цифры: # и $ ломают systemd EnvironmentFile
DEBUG=False
ALLOWED_HOSTS=begimbaev-dormitory.uk,www.begimbaev-dormitory.uk,92.5.136.42,localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://begimbaev-dormitory.uk,https://www.begimbaev-dormitory.uk
DATABASE_URL=postgres://dormitory:<пароль>@localhost:5432/dormitory
EMAIL_HOST_USER=begimbaev.dormitory@gmail.com
EMAIL_HOST_PASSWORD=<app password Gmail>
DEFAULT_FROM_EMAIL=Dormitory <begimbaev.dormitory@gmail.com>
TELEGRAM_BOT_TOKEN=<токен @begimbaev_dormitory_bot>
DJANGO_SETTINGS_MODULE=config.settings.production
SECURE_SSL_REDIRECT=False   # HTTPS терминирует Cloudflare
```

### 2.4. Локальная разработка

```bash
# Backend (SQLite, DEBUG=True, CORS открыт)
cd domitory
python -m venv venv && venv/Scripts/activate
pip install -r requirements/local.txt
python manage.py migrate
python manage.py create_initial_roles
python manage.py create_superadmin --email admin@dormitory.uz --password admin123
python manage.py runserver

# Frontend (проксирует /api и /media на 127.0.0.1:8000)
cd frontend
npm ci --legacy-peer-deps    # vite 8 конфликтует с @tailwindcss/vite по peer deps
npm run dev                  # http://localhost:5173

# Telegram-бот
python manage.py run_telegram_bot
```

Настройки: `config/settings/local.py` (SQLite), `test.py` (SQLite in-memory, MD5-хеши паролей), `production.py` (DATABASE_URL, WhiteNoise, HSTS). `manage.py` по умолчанию берёт `local`. На сервере поэтому обязательна обёртка `manage.sh`.

---

## 3. Архитектура backend

### 3.1. Принципы

- **Fat services, thin views.** Вся логика в `services.py` каждого приложения. View принимает запрос, валидирует сериализатором, зовёт сервис, отдаёт ответ.
- **Single-tenant.** Приложение `organizations` осталось только ради истории миграций, фильтрации по организации нет.
- **UUID** как первичный ключ везде, кроме `Role`, `TelegramLink`, `PasswordResetOTP`, `AuditLog` (тоже UUID).
- **Аудит** всего важного через `AuditService.log(user, action, instance, changes)`.
- **Единый формат ошибок** через `common/exceptions.py`:

```json
{"error": {"code": "ValidationError", "message": "...", "details": {}}}
```

- **Пагинация** `PageNumberPagination`: `page`, `page_size` (по умолчанию 20, максимум 100). Ответ: `{count, next, previous, results}`.
- **Фильтры** django-filter плюс `search` и `ordering` на каждом списке.

### 3.2. Приложения

| Приложение | За что отвечает | Ключевые файлы |
|-----------|-----------------|----------------|
| `accounts` | Пользователи, роли, JWT, OTP, Telegram-бот | models, views (11 auth-эндпоинтов), telegram.py, management/commands |
| `inventory` | Корпуса, этажи, комнаты | RoomService: occupancy, gender policy |
| `residents` | Жильцы, опекуны, документы, факультеты | ResidentViewSet с действиями balance/transfer/withdraw |
| `occupancy` | Договоры, назначения комнат, история проживания | ContractService, RoomAssignmentService (самая сложная логика) |
| `billing` | Начисления, платежи, FIFO-распределение, баланс | ChargeService, PaymentService, FIFOAllocator, BalanceService |
| `reports` | 6 отчётов | ReportService |
| `audit` | Журнал действий | AuditService, переводы статусов в сериализаторе |
| `access_control` | События входа/выхода (турникет) | только CRUD, интеграции с оборудованием нет |
| `organizations` | Не используется | оставлено для миграций |
| `notifications`, `payments` | Пустые заглушки | только `__init__.py` |

`common/`: миксин `TimestampMixin` (created_at, updated_at), пагинация, обработчик ошибок, `RoleBasedPermission`, валидатор телефона `^\+?\d{10,15}$`.

### 3.3. Legacy-код, который нужно удалить

В рабочей копии лежат незакоммиченные остатки самой первой версии проекта (2024, Heroku):

- `domitory/domitory/` — старый пакет настроек с `django_heroku` и захардкоженным SECRET_KEY
- `domitory/main/` — старые модели Student, Parent, Payment
- `domitory/requirements.txt`, `domitory/runtime.txt`, корневой `requirements.txt` — с `django-heroku`
- `domitory/pythonanywhere_wsgi.py`, `config/settings/pythonanywhere.py`

Ничего из этого не подключено в `INSTALLED_APPS` и не влияет на работу, но сбивает с толку. Актуальные зависимости только в `domitory/requirements/*.txt`.

---

## 4. Модель данных

### 4.1. Иерархия

```
Building ──< Floor ──< Room
                         │
Resident ──< AccommodationContract ──< RoomAssignment ──> Room
   ├──< Guardian
   ├──< ResidentDocument
   ├──< StayRecord
   ├──< Charge ──< PaymentAllocation >── Payment >── Resident
   ├──< Discount           (модель есть, в API не используется)
   └──< AccessEvent

User ──> Role
TelegramLink (phone ↔ telegram_id до создания User)
PasswordResetOTP ──> User
AuditLog ──> User
TariffPlan                 (модель есть, в логике не используется)
```

### 4.2. Справочник моделей

**accounts.User** (AbstractUser без username): `email` unique, `full_name`, `role` FK, `phone_number` unique nullable, `photo`, `telegram_id` unique nullable. Пустой телефон сохраняется как NULL.

**accounts.Role**: `name` из списка platform_admin, university_admin, dorm_manager, accountant, security_staff.

**inventory.Building**: `name`, `address`, `gender_policy` (male_only / female_only / mixed), `is_active`.

**inventory.Floor**: `building`, `number` (уникален в корпусе), `description`.

**inventory.Room**: `floor`, `room_number` (уникален на этаже), `capacity` (кроватей, по умолчанию 4), `current_occupancy` (занятых кроватей, считается сервисами), `gender_policy`, `status` (available / full / maintenance / closed), `monthly_price` (цена за ОДНУ кровать в месяц), `description`. Свойства `available_beds`, `is_full`.

**residents.Resident**: `full_name`, `birth_date`, `gender` (male / female, обязателен), `phone_number`, `email`, `university_id` (студбилет, обязателен, не уникален), `faculty` (строка, не FK), `course`, `photo`, `status` (pending / active / evicted / graduated / suspended), `notes`.

**residents.Faculty**: справочник названий, `name` unique. С Resident связан только текстом.

**residents.Guardian**: `resident`, `full_name`, `relationship` (father / mother / sibling / uncle / aunt / other), `phone_number`, `is_emergency_contact`.

**residents.ResidentDocument**: `resident`, `document_type` (id_card / passport / drivers_license), `document_number`, `file` (media/residents/documents/).

**occupancy.AccommodationContract**: `resident`, `building`, `contract_number` unique, `start_date`, `end_date`, `status` (active / expired / terminated), `created_by`. Валидация: end_date > start_date (в `clean()`, через API не вызывается).

**occupancy.RoomAssignment**: `contract`, `resident`, `room`, `beds_purchased` (сколько кроватей оплачивает, по умолчанию 1), `start_date`, `end_date`, `status` (active / completed / transferred), `assigned_by`.

**occupancy.StayRecord**: `resident`, `check_in_at`, `check_out_at`, `reason` (initial_check_in / transfer / eviction / graduation / temporary_leave / return), `recorded_by`. Только чтение через API.

**billing.Charge** (начисление за месяц): `resident`, `room`, `period_month`, `period_year`, `amount`, `start_day`, `end_day`, `days_charged`, `is_prorated`, `status` (pending / partially_paid / paid / overdue / cancelled), `due_date`, `tariff_plan` (не используется). Уникальность по (resident, month, year, room). Свойства `paid_amount` (сумма allocations) и `remaining`.

**billing.Payment**: `resident`, `amount` (может быть отрицательной при возврате), `payment_date`, `payment_method` (cash / bank_transfer), `status` (completed / cancelled), `recorded_by`, `notes`, `external_reference` (задел под онлайн-оплату).

**billing.PaymentAllocation**: `payment`, `charge`, `amount`. Уникальна пара payment+charge.

**audit.AuditLog**: `user`, `action` (create / update / delete), `model_name`, `object_id`, `changes` JSON, `ip_address` (сейчас всегда NULL), `timestamp`.

**access_control.AccessEvent**: `resident`, `direction` (in / out), `timestamp`, `device_name`, `card_number`.

**accounts.PasswordResetOTP**: `user`, `code` (6 цифр), `created_at`, `is_used`. Живёт 10 минут (`PASSWORD_RESET_OTP_EXPIRY`). Используется для всех OTP: сброс пароля, вход по телефону, подтверждение email и телефона при создании сотрудника.

### 4.3. Статусы и их переходы

Resident: `pending` при создании → `active` при назначении комнаты → `evicted` при расторжении договора или выселении. Обратно в `active` при новом заселении. `graduated` и `suspended` выставляются только вручную через редактирование.

Contract: `active` при создании → `terminated` при расторжении. Статус `expired` кодом никогда не выставляется: cron `auto_evict_expired` истёкшие договоры именно расторгает.

RoomAssignment: `active` → `completed` (выселение, расторжение, удаление жильца) или `transferred` (перевод).

Room: `available` ↔ `full` меняются автоматически по занятости. `maintenance` и `closed` ставятся вручную и только если комната пуста.

Charge: `pending` → `partially_paid` → `paid` через FIFO. `cancelled` при расторжении и переводе. `overdue` в коде нигде не выставляется, статус зарезервирован.

---

## 5. Роли и права

Пять ролей, иерархия через классы разрешений в `apps/accounts/permissions.py`:

| Класс | Кому разрешено |
|-------|----------------|
| IsPlatformAdmin | platform_admin |
| IsUniversityAdmin | + university_admin |
| IsDormManager | + dorm_manager |
| IsAccountant | platform_admin, university_admin, accountant |
| IsSecurityStaff | все пять ролей (фактически «любой авторизованный с ролью») |

Пользователь без роли не проходит ни одну проверку.

Матрица по эндпоинтам:

| Ресурс | Чтение | Запись |
|--------|--------|--------|
| users, roles | university_admin+ (roles: любой) | university_admin+ |
| buildings, floors | dorm_manager+ | dorm_manager+ |
| rooms, residents, faculties, contracts, assignments, stay-records | все роли | dorm_manager+ |
| guardians, documents (отдельные viewsets) | dorm_manager+ | dorm_manager+ |
| residents/{id}/guardians, /documents, /balance, /transfer, /withdraw | все роли | все роли (см. проблему 14.4) |
| charges, payments | accountant-группа | accountant-группа |
| reports/* | все роли | — |
| audit | university_admin+ | — |
| access-events | все роли | все роли |

Веб-панель дополнительно прячет пункты меню по роли (см. раздел 9), но это только UI.

---

## 6. Аутентификация

JWT через SimpleJWT: access 30 минут, refresh 7 дней, refresh ротируется при обновлении, blacklist выключен. Заголовок `Authorization: Bearer <access>`.

Четыре сценария:

**Email + пароль.** `POST /auth/login/` → `{access, refresh, user_id}`. Неверные данные → 401.

**Телефон + OTP через Telegram.** `POST /auth/login/phone/ {phone}` находит User по телефону, берёт telegram_id из User или из TelegramLink, шлёт 6-значный код в Telegram. `POST /auth/login/phone/confirm/ {phone, code}` → токены. Если телефон не привязан к Telegram, ошибка `TelegramNotLinked` с подсказкой написать боту.

**Сброс пароля.** `POST /auth/password-reset/ {email}` шлёт код в Telegram, если привязан, иначе на email через Gmail SMTP. Всегда отвечает 200, чтобы не раскрывать существование email. `POST /auth/password-reset/confirm/ {email, code, new_password}`, пароль минимум 8 символов.

**Подтверждение контактов при создании сотрудника.** Админ в форме создания пользователя вызывает `POST /auth/verify-email/ {email}` и `POST /auth/verify-phone/ {phone}`, коды уходят на указанный email или в Telegram по телефону, подтверждение через `/confirm/ {code}`. OTP привязывается к текущему админу, а не к будущему пользователю. Сам `POST /users/` подтверждение не проверяет, это только UI-flow.

Клиенты хранят токены: веб в localStorage, Flutter в SharedPreferences. Оба на 401 пробуют refresh и при неудаче разлогинивают.

---

## 7. Бизнес-логика

Все суммы в сумах, Decimal с двумя знаками. Цена комнаты `monthly_price` это цена одной кровати в месяц.

### 7.1. Пропорциональное начисление

`Charge.calculate_prorated_amount(price, year, month, start_day, end_day)`:

```
days = end_day - start_day + 1
если days >= дней в месяце → price целиком
иначе → price / дней_в_месяце × days, округление до 0.01 (ROUND_HALF_UP)
```

`ChargeService.generate_charges_for_assignment(contract, room, start_date_override, price_override)` идёт по месяцам от даты начала до даты окончания договора включительно и на каждый месяц создаёт Charge с точными днями. Срок оплаты `due_date` — 25 число месяца, но не раньше даты начала. Если начисление на этот месяц и комнату уже есть: отменённое реанимируется, с другой суммой пересчитывается, совпадающее не трогается.

Пример: договор с 3 апреля по 30 июня, цена 500 000. Апрель: 28 дней из 30 → 466 666.67. Май и июнь полные → по 500 000.

### 7.2. Заселение одного жильца

`RoomAssignmentService.assign_resident_to_room(resident, room, contract, assigned_by, beds_purchased=1)`:

1. Проверки: у жильца нет активного назначения; договор active; в комнате хватает кроватей (`current_occupancy + beds <= capacity`); пол жильца подходит политике корпуса и комнаты.
2. Создаётся RoomAssignment со start_date = сегодня.
3. `room.current_occupancy += beds`, при заполнении status = full.
4. StayRecord с причиной initial_check_in.
5. Resident.status = active.
6. Начисления на весь срок договора по цене `monthly_price × beds`.
7. FIFO-перераспределение всех платежей жильца.
8. Аудит.

В веб-панели это два запроса подряд: `POST /contracts/` (номер `ДГ-{год}-{4 случайные цифры}`, срок 1–12 месяцев кнопками), затем `POST /assignments/`. Можно пропустить назначение комнаты и оставить договор без заселения.

### 7.3. Покупка всей комнаты

`RoomAssignmentService.assign_full_room([(resident, contract), ...], room, assigned_by)`, эндпоинт `POST /assignments/full-room/`:

- Комната должна быть пустой, жильцов не больше вместимости.
- Общая стоимость `monthly_price × capacity` делится поровну между жильцами.
- Кровати распределяются для учёта занятости: `capacity // n` каждому, остаток по одной первым.
- Комната сразу становится full.

Если один из группы выселяется или переводится, у оставшихся `beds_purchased` сбрасывается в 1, освобождённые кровати возвращаются в комнату, и их начисления с текущего месяца пересчитываются на цену одной кровати (`_recalculate_resident_charges`).

### 7.4. Оплата и FIFO

`PaymentService.record_payment(resident, amount, date, method, recorded_by, notes)`:

1. Создаётся Payment со статусом completed.
2. Сумма раскладывается по неоплаченным начислениям (pending, overdue, partially_paid) от самого раннего периода к позднему: `order_by(period_year, period_month, start_day)`.
3. На каждое начисление создаётся PaymentAllocation на `min(остаток платежа, остаток начисления)`, статус начисления обновляется на paid или partially_paid.
4. Если платёж больше суммы долга, остаток нигде не хранится отдельно: он виден как отрицательный `debt` в балансе.

`FIFOAllocator.reallocate_all_payments(resident)` удаляет все allocations, сбрасывает начисления в pending и заново раскладывает все completed-платежи по дате. Вызывается после любого изменения начислений (заселение, перевод, расторжение, пересчёт кроватей).

### 7.5. Баланс

`BalanceService.get_resident_balance(resident)`:

```
total_charges  = сумма amount всех начислений кроме cancelled
total_payments = сумма amount всех completed платежей (включая отрицательные возвраты)
total_paid     = сумма allocations по неотменённым начислениям
debt           = total_charges - total_payments
```

Положительный `debt` — долг, отрицательный — переплата.

### 7.6. Возврат переплаты

`POST /residents/{id}/withdraw/`: если `debt < 0`, создаётся Payment с отрицательной суммой `-переплата`, метод cash, notes «Withdrawal: …». После этого баланс равен нулю. Allocations для отрицательного платежа не создаются.

### 7.7. Расторжение договора и выселение

`ContractService.terminate_contract(contract, user)`:

1. Contract.status = terminated.
2. Все активные назначения по договору закрываются (completed, end_date сегодня), кровати освобождаются, комната при необходимости снова available. Соседям по «полной комнате» сбрасываются кровати до 1 с пересчётом.
3. `_refund_on_termination`: начисление текущего месяца обрезается по сегодняшний день (пропорционально), начисления, начинающиеся после сегодня, и все будущие месяцы отменяются, FIFO перезапускается.
4. Resident.status = evicted.
5. Аудит.

`RoomAssignmentService.evict_resident(assignment, user)`, эндпоинт `POST /assignments/{id}/close/`: закрывает назначение, освобождает кровати, вызывает terminate_contract, пишет StayRecord с причиной eviction, пересчитывает соседей.

`POST /contracts/{id}/terminate/` делает то же самое без отдельной StayRecord.

Cron `auto_evict_expired` каждую ночь находит active-договоры с `end_date < сегодня` и расторгает их от имени первого platform_admin. Есть `--dry-run`.

### 7.8. Перевод в другую комнату

`RoomAssignmentService.transfer_resident(assignment, new_room, user)`, эндпоинты `POST /assignments/{id}/transfer/` и `POST /residents/{id}/transfer/` с телом `{new_room}`:

1. Проверка вместимости и гендерной политики новой комнаты.
2. Старое назначение → transferred, кровати в старой комнате освобождаются.
3. Новое назначение на 1 кровать (даже если раньше было больше), занятость новой комнаты +1.
4. StayRecord с причиной transfer.
5. Соседям по старой «полной комнате» сброс до 1 кровати.
6. `_recalculate_charges_on_transfer`: текущий месяц делится на две части. Старая комната: с 1 (или start_day) по день перед переводом. Новая комната: со дня перевода до конца месяца. Будущие месяцы по старой комнате отменяются и создаются заново по цене новой комнаты до конца договора. FIFO перезапускается.

Дата перевода всегда сегодня. Поле «дата перевода» в веб-форме на сервер не передаётся.

### 7.9. Удаление жильца

`DELETE /residents/{id}/` закрывает активные назначения и освобождает кровати, затем удаляет жильца каскадно вместе с договорами, начислениями, платежами и документами. Аудит при этом не пишется. Операция необратима.

### 7.10. Управление комнатами

- Нельзя перевести комнату в maintenance или closed, пока в ней кто-то живёт (ошибка с текстом «сначала переселите N жильцов»).
- `current_occupancy` только для чтения через API, меняется сервисами. Если разъехалось, команда `fix_occupancy` пересчитывает по активным назначениям с учётом beds_purchased.
- Гендерная политика проверяется на уровне корпуса и комнаты. Женщина в male_only комнату не заселится, и наоборот. mixed пропускает всех.

### 7.11. Отчёты

| Отчёт | Что считает |
|-------|-------------|
| summary | активные жильцы; свободные кровати по комнатам available+full; общий долг (неоплаченные начисления минус их allocations); собрано за текущий месяц |
| occupancy | по каждому активному корпусу и этажу: комнат, вместимость, занято, свободно, процент |
| available-rooms | комнаты со статусом available, фильтры building и gender |
| debtors | активные жильцы с долгом > 0 по неоплаченным начислениям, сортировка по долгу |
| payments | список completed-платежей за период с итогом, фильтры date_from, date_to, method |
| residents | список жильцов, фильтры status, faculty, gender |

---

## 8. API

Базовый префикс `/api/v1/`. Все эндпоинты кроме auth требуют JWT. Полная OpenAPI-схема: `/api/schema/`, Swagger UI: `/api/docs/`.

### 8.1. Auth и пользователи

| Метод и путь | Назначение |
|--------------|-----------|
| POST auth/login/ | email + password → токены |
| POST auth/login/phone/ | запрос OTP в Telegram |
| POST auth/login/phone/confirm/ | phone + code → токены |
| POST auth/refresh/ | обновить access |
| GET auth/me/ | текущий пользователь с ролью |
| POST auth/password-reset/, auth/password-reset/confirm/ | сброс пароля |
| POST auth/verify-email/, /confirm/ | OTP на email при создании сотрудника |
| POST auth/verify-phone/, /confirm/ | OTP в Telegram при создании сотрудника |
| GET roles/ | список ролей |
| GET/POST users/, GET/PATCH/PUT/DELETE users/{id}/ | CRUD сотрудников. Создание: email, full_name, password (мин. 8), role, phone_number, photo. Обновление: full_name, role, phone_number, is_active |

### 8.2. Инфраструктура

| Путь | Фильтры |
|------|---------|
| buildings/ | is_active, gender_policy; search по name, address |
| floors/ | building |
| rooms/ | status, gender_policy, building, floor_number; search по room_number; ordering room_number, capacity, current_occupancy, monthly_price |
| rooms/available/ | то же, только status=available |

Список комнат отдаёт краткий сериализатор, деталь добавляет building_id, description, даты.

### 8.3. Жильцы

| Путь | Назначение |
|------|-----------|
| residents/ | status (exact, in), gender, faculty, course, available=true (без активного назначения и в статусе pending или evicted); search по ФИО, студбилету, телефону |
| residents/{id}/ | деталь с вложенными guardians и documents |
| residents/{id}/guardians/ GET, POST | опекуны |
| residents/{id}/documents/ GET, POST | документы, multipart с полем file |
| residents/{id}/balance/ | баланс |
| residents/{id}/transfer/ | перевод, тело {new_room} |
| residents/{id}/withdraw/ | возврат переплаты |
| guardians/, documents/ | прямые CRUD |
| faculties/ | справочник |

### 8.4. Проживание

| Путь | Назначение |
|------|-----------|
| contracts/ | фильтры status, resident, building; search по номеру и ФИО |
| contracts/{id}/terminate/ | расторжение |
| assignments/ | фильтры status, resident, room, building |
| POST assignments/ | заселение, тело {contract, resident, room, beds_purchased?} |
| POST assignments/full-room/ | тело {room, assignments: [{resident, contract}, …]} |
| assignments/{id}/close/ | выселение |
| assignments/{id}/transfer/ | перевод, тело {new_room} |
| stay-records/ | история, только чтение |

### 8.5. Финансы

| Путь | Назначение |
|------|-----------|
| charges/ | только чтение; фильтры status, resident, period_month, period_year |
| payments/ | фильтры resident, payment_method, status, date_from, date_to |
| POST payments/ | тело {resident, amount, payment_date, payment_method, notes?} |

### 8.6. Отчёты, аудит, доступ

`reports/summary/`, `reports/occupancy/?building=`, `reports/available-rooms/?building=&gender=`, `reports/debtors/`, `reports/payments/?date_from=&date_to=&method=`, `reports/residents/?status=&faculty=&gender=`.

`audit/`: фильтры action, model_name, user, date_from, date_to. Ответ содержит `action_display` и `changes_display` с русскими переводами значений.

`access-events/`: CRUD, фильтры resident, direction, device_name, date_from, date_to.

---

## 9. Веб-интерфейс (React)

Стек: React 19, react-router 7, axios, Tailwind v4 через `@tailwindcss/vite`, иконки lucide-react. Тема светлая, акцент Prussian Blue `#003153`. Токены цветов в `src/index.css`.

### 9.1. Страницы и маршруты

| Маршрут | Страница | Что делает |
|---------|----------|-----------|
| /login | LoginPage | вкладки Email и Телефон, OTP, восстановление пароля, переключатель языка |
| / | DashboardPage | 4 карточки summary, загрузка по корпусам, топ должников |
| /residents | ResidentsPage | список с поиском и фильтром по статусу |
| /residents/new | NewResidentPage | анкета жильца + опекун + документ за один проход |
| /residents/:id | ResidentDetailPage | вкладки Финансы, Опекуны, Документы, Проживание; кнопки редактировать, перевести, выселить, удалить, вернуть переплату |
| /buildings | BuildingsPage | CRUD корпусов, переход к этажам |
| /buildings/:id/floors | FloorsPage | этажи и комнаты корпуса, CRUD |
| /rooms | RoomsPage | сетка или список комнат по корпусу и этажу, клик открывает EditRoomModal |
| /contracts | ContractsPage | список, вкладки по статусу, расторжение, кнопка нового договора |
| /finance | FinancePage | список платежей |
| /finance/payment/new | NewPaymentPage | выбор жильца, баланс, форма платежа |
| /reports | ReportsPage | 5 вкладок отчётов |
| /access | AccessPage | события входа и выхода, фильтр направления |
| /audit | AuditPage | журнал с раскрытием изменений и фильтрами |
| /users | UsersPage | сотрудники, AddUserModal с подтверждением email и телефона |

Видимость пунктов меню по ролям задана в `Sidebar.tsx`: dorm_manager не видит Финансы, Аудит и Пользователей; accountant видит только Главную, Финансы и Отчёты; security_staff видит Главную, Жильцов, Комнаты, Отчёты и Доступ.

### 9.2. Ключевые модалки

- **NewContractModal**: шаг 1 договор (поиск жильца, корпус, срок 1–12 месяцев), шаг 2 выбор этажа и комнаты, можно пропустить.
- **EditRoomModal**: редактирование комнаты, список жильцов с кнопкой перевода, свободные слоты с быстрым заселением (создаёт договор и назначение), режим «Купить всю комнату».
- **TransferResidentModal**, **EvictResidentModal**, **EditResidentModal**, **AddGuardianModal**, **UploadDocumentModal**, **AddUserModal**.

### 9.3. i18n

`src/i18n/ru.ts`, `uz.ts`, `kk.ts`, около 400 ключей. Хук `useTranslation()` даёт `t(key)`, `lang`, `setLang`. Выбор хранится в localStorage под ключом `lang`. Отсутствующий ключ падает на русский.

### 9.4. Сборка

`npm run build` = `tsc && vite build`, результат в `dist/`. Предупреждение о чанке больше 500 КБ ожидаемо. `deploy.sh` собирает и заливает сам.

---

## 10. Мобильное приложение (Flutter)

Пакет `dormitory_admin`, название на устройстве EDormitory. Зависимости: http, shared_preferences, provider, cached_network_image, intl, file_picker, sensors_plus.

`core/api.dart`: статический клиент с baseUrl (прод `https://begimbaev-dormitory.uk/api/v1`, для локальной сети закомментированы варианты), автоматический refresh на 401, логирование всех запросов в `HttpLogger`. `AuthProvider` держит текущего пользователя.

Навигация: нижняя панель из 5 вкладок (Главная, Жильцы, Комнаты, Финансы, Меню), из Меню открываются Договоры, Корпуса, Отчёты, Аудит, Сотрудники и профиль.

| Экран | Функции |
|-------|---------|
| login | email/пароль, телефон/OTP, сброс пароля |
| dashboard | summary, загрузка, должники |
| residents, resident_detail | список, деталь с балансом, начислениями, платежами, договорами; заселение, перевод, выселение, возврат, удаление |
| add_resident, edit_resident | анкета, факультет из справочника, опекун |
| rooms, full_room | комнаты по корпусу и этажу, покупка всей комнаты |
| buildings, floors | CRUD корпусов, этажей, комнат |
| contracts, create_contract | список, расторжение, создание с назначением комнаты |
| finance, new_payment | платежи, новый платёж |
| reports | 5 отчётов |
| audit | журнал |
| users, add_user | сотрудники, создание с OTP-подтверждением |
| dev/dev_tools | скрытый экран логов HTTP, открывается встряхиванием телефона |

Сборка iOS делается на Mac из `~/mobile_admin_build/` (не из iCloud-папки, иначе codesign падает). Перед сборкой синхронизировать `lib/`, `pubspec.yaml`, `android/app/src/main/AndroidManifest.xml`, `ios/Runner/Info.plist`. На Windows-машине Flutter не установлен.

---

## 11. Telegram-бот

Бот `@begimbaev_dormitory_bot`, код в `accounts/management/commands/run_telegram_bot.py`, работает как systemd-сервис `dormitory-bot` через long-polling `getUpdates` с таймаутом 30 секунд.

Единственная функция — привязка телефона к Telegram:

1. `/start` → бот просит отправить контакт кнопкой.
2. Получив контакт, сохраняет пару phone → chat_id в `TelegramLink` (телефон нормализуется до формата с плюсом).
3. Если User с таким телефоном уже есть, записывает `telegram_id` прямо в него и отвечает «Аккаунт привязан».
4. Иначе отвечает, что номер сохранён и заработает после создания аккаунта администратором.

Отправка OTP идёт из `accounts/telegram.py` через `sendMessage`. Если токен пустой, отправка тихо возвращает False.

Одновременно должен работать только один экземпляр бота: два long-polling на один токен дают ошибку 409 у Telegram.

---

## 12. Тесты

| Набор | Где | Сколько | Как запускать |
|-------|-----|---------|---------------|
| Unit backend | `domitory/apps/*/tests/` | 132 | `cd domitory && pytest` (SQLite in-memory) |
| API QA | `qa/test_api.py` | 72 | `TEST_ENV=prod QA_ADMIN_EMAIL=… QA_ADMIN_PASSWORD=… py -3.13 -m pytest qa/test_api.py` |
| E2E Playwright | `qa/test_e2e.py` | 50 | `TEST_ENV=prod py -3.13 -m pytest qa/test_e2e.py --headed` |

QA-тесты ходят на живой сервер (`TEST_ENV=local` → 127.0.0.1:8000 и :5173, `prod` → домен). Учётка админа берётся из переменных `QA_ADMIN_EMAIL` и `QA_ADMIN_PASSWORD`, по умолчанию admin@dormitory.uz / admin123. Тесты создают тестовый корпус, жильца, договор, платежи и в конце удаляют корпус и жильца, но следы в аудите остаются. На проде их лучше не гонять на боевых данных.

Состояние на 2026-09-02 на проде: 69 из 72 API-тестов проходят. Три падают в классах TestTerminate и TestWithdraw: тесты ожидают, что после расторжения появится начисление со статусом cancelled и долг станет ≤ 0, а сервер отдаёт долг. Причина в пропорциональной логике расторжения: текущий месяц не отменяется, а обрезается по сегодняшний день, и в сценарии теста жилец остаётся должен за прожитые дни. Нужно решить, что правильно, и поправить либо тесты, либо `_refund_on_termination`.

На Windows системный Python 3.14 без pytest, используйте `py -3.13`.

---

## 13. Эксплуатация

```bash
# Состояние сервисов
ssh oracle "systemctl status dormitory dormitory-bot nginx"

# Логи
ssh oracle "sudo journalctl -u dormitory -f"
ssh oracle "sudo journalctl -u dormitory-bot -f"
ssh oracle "sudo tail -f /var/log/nginx/error.log"

# Любая manage.py-команда (ВСЕГДА через manage.sh)
ssh oracle "sudo /home/dormitory/manage.sh showmigrations"
ssh oracle "sudo /home/dormitory/manage.sh auto_evict_expired --dry-run"
ssh oracle "sudo /home/dormitory/manage.sh fix_occupancy"
ssh oracle "sudo /home/dormitory/manage.sh create_superadmin --email X --password Y --name Z"

# Django shell
ssh oracle "sudo /home/dormitory/manage.sh shell"

# Бэкап базы (скачать локально)
ssh oracle "sudo -u postgres pg_dump -Fc dormitory" > deploy/oracle/backups/dormitory_$(date +%F).dump

# Восстановление
scp dump.file oracle:/tmp/d.dump
ssh oracle "sudo systemctl stop dormitory dormitory-bot && sudo -u postgres pg_restore --clean --if-exists --no-owner --role=dormitory -d dormitory /tmp/d.dump && sudo systemctl start dormitory dormitory-bot"

# Полная очистка базы (необратимо)
ssh oracle "sudo /home/dormitory/manage.sh flush --noinput && sudo /home/dormitory/manage.sh create_initial_roles"

# Деплой
bash deploy/oracle/deploy.sh oracle
```

Автоматических бэкапов нет. Раз в неделю стоит скачивать дамп вручную.

Особенности Oracle Free: VM могут остановить, если 7 дней подряд CPU, сеть и память ниже 20 %. Данные при этом не теряются, инстанс просто запускается заново из консоли. Переход на Pay As You Go снимает это ограничение, Always Free ресурсы остаются бесплатными.

---

## 14. Известные проблемы и технический долг

Отсортировано по важности.

1. **Незакоммиченная работа.** В рабочей копии 50+ изменённых файлов: пропорциональный биллинг в occupancy, переводы в аудите, access_control, страница доступа, переезд на Oracle, ребрендинг, правки QA. Плюс удалённые файлы Xcode-проекта в `mobile_admin/ios/` (project.pbxproj, схемы, AppDelegate.swift). Если удаление iOS-файлов не было намеренным, их надо восстановить из git до коммита.
2. **Legacy-папки** из раздела 3.3 нужно удалить.
3. **Слабый пароль администратора** (dormitory@gmail.com / 12345678) на публичном сайте с персональными данными студентов. Сменить до передачи сотрудникам.
4. **Комендант не видит финансы жильца.** ResidentDetailPage и мобильный экран запрашивают `/charges/` и `/payments/`, а эти эндпоинты закрыты для dorm_manager (IsAccountant). Вкладка «Финансы» у коменданта получит 403. Либо открыть чтение начислений коменданту, либо прятать вкладку.
5. **Статусы overdue и expired никогда не выставляются.** Нет задачи, которая помечала бы просроченные начисления. Отчёт должников считает по pending/partially_paid, поэтому работает, но статус «Просрочено» в интерфейсе мёртвый.
6. **Три падающих QA-теста** на расторжение (раздел 12).
7. **OTP при создании сотрудника** привязан к админу, а не к email или телефону. Два админа одновременно могут перепутать коды, и подтверждение не проверяется сервером при `POST /users/`.
8. **Удаление жильца** не пишется в аудит и каскадно удаляет платежи. Для финансовых записей это плохо: лучше запретить удаление жильцов с платежами или делать мягкое удаление.
9. **Дата перевода и причина** в TransferResidentModal не отправляются на сервер, перевод всегда сегодняшним днём.
10. **AccessEvent без источника.** Модель и API есть, страница есть, но события никто не создаёт: интеграции с турникетом или картами нет.
11. **ip_address в аудите** всегда пустой: `AuditService.get_client_ip` есть, но не вызывается.
12. **Faculty не связан с Resident** по FK, только текстом. Переименование факультета не обновит жильцов.
13. **Отрицательные платежи** (возвраты) попадают в отчёт по платежам и в «собрано за месяц» со знаком минус. Возможно, так и задумано, но стоит показывать их отдельно.
14. **Frontend types** содержат поле `organization`, которого backend давно не отдаёт.
15. **Пустые приложения** `notifications` и `payments` без моделей.
16. **`Discount` и `TariffPlan`** есть в моделях и миграциях, но нигде не используются: ни в API, ни в расчётах.
17. **Нет автоматических бэкапов** базы.

---

## 15. Что не сделано и планы

По CLAUDE.md и MasterPlan.md:

| Этап | Содержание | Статус |
|------|-----------|--------|
| 1 | Веб-платформа для администрации | готово, в проде |
| 1.5 | Мобильное приложение для админов | готово, требует пересборки после ребрендинга |
| 2 | Приложение для студентов: роль student, личный кабинет, баланс, бронирование, уведомления | не начат, модели `notifications` и `payments` созданы пустыми |
| 3 | Онлайн-оплата Payme / Click, поле `Payment.external_reference` под webhook | не начат |

Ближайшие практические шаги, которые напрашиваются из кода: закоммитить текущее состояние, удалить legacy, решить вопрос с правами коменданта на финансы, добавить cron для overdue, настроить бэкапы.

---

## Приложение А. Быстрая карта файлов

```
domitory/
├── config/settings/{base,local,production,test}.py
├── config/urls.py                       # все include под /api/v1/
├── apps/<app>/{models,serializers,views,urls,filters,services}.py
├── apps/accounts/management/commands/   # create_initial_roles, create_superadmin, run_telegram_bot
├── apps/occupancy/management/commands/auto_evict_expired.py
├── apps/inventory/management/commands/fix_occupancy.py
├── common/                              # mixins, pagination, exceptions, permissions, validators
├── conftest.py                          # фикстуры unit-тестов
└── requirements/{base,local,production,test}.txt

frontend/src/
├── App.tsx                              # маршруты
├── api/{client,endpoints}.ts            # axios + все вызовы API
├── hooks/useAuth.ts
├── pages/*.tsx                          # 15 страниц
├── components/*.tsx                     # модалки, таблица, пагинация, layout, sidebar
├── i18n/{index.tsx,ru,uz,kk}.ts
├── types/index.ts
└── utils/format.ts                      # деньги, даты, статусы

mobile_admin/lib/
├── main.dart, core/{api,auth_provider,theme,widgets,http_logger}.dart
└── screens/<раздел>/*.dart

qa/{conftest,test_api,test_e2e}.py
deploy/oracle/                           # setup_server.sh, deploy.sh, migrate_db.sh, manage.sh, nginx/, systemd/, README.md
```
