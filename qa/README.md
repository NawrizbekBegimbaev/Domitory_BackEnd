# QA Test Suite — Dormitory

## Требования

1. Backend запущен: `cd domitory && python3 manage.py runserver`
2. Frontend запущен: `cd frontend && npm run dev`
3. Admin user: `admin@dormitory.uz` / `admin123`

## Запуск

```bash
# Все тесты
cd qa && python3 -m pytest -v

# Только API тесты
python3 -m pytest test_api.py -v

# Только E2E тесты (headless)
python3 -m pytest test_e2e.py -v

# E2E с видимым браузером
python3 -m pytest test_e2e.py -v --headed

# E2E с замедлением (для наблюдения)
python3 -m pytest test_e2e.py -v --headed --slowmo 500
```

## Покрытие

### API Tests (test_api.py) — 50+ тестов
- Auth: login, refresh, me, password reset
- Roles: list
- Buildings: CRUD
- Floors: CRUD + unique constraint
- Rooms: CRUD + available + status validation
- Faculties: CRUD
- Residents: CRUD + guardians + balance + search + filter
- Contracts: CRUD + terminate
- Assignments: create + auto-charges
- Payments: FIFO allocation
- Transfer: room change + occupancy
- Terminate: eviction + charge cancellation + refund
- Withdraw: overpayment withdrawal
- Reports: 6 endpoints
- Audit: list + filter
- Gender validation: female in male room blocked
- Cleanup: delete test data

### E2E Tests (test_e2e.py) — 30+ тестов
- Login: success, failure, tabs, language switch, forgot password
- Dashboard: stats, tables
- Sidebar: all navigation links, language switch
- Residents: list, tabs, add page
- Buildings: list
- Rooms: list, grid/list toggle
- Contracts: list
- Finance: list, new payment
- Reports: page loads
- Audit: list, expand detail
- Users: list, click detail
- Logout
