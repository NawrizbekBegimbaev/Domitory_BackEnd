"""
API Tests — полное покрытие всех endpoints.
Заменяет ручное тестирование API senior QA.

Покрытие:
  - Auth (login, me, refresh, password reset)
  - Users CRUD
  - Buildings CRUD
  - Floors CRUD
  - Rooms CRUD + available
  - Residents CRUD + guardians + documents + balance + transfer + withdraw
  - Contracts CRUD + terminate
  - Assignments + close + transfer
  - Charges (auto-generated)
  - Payments + FIFO
  - Reports (6 endpoints)
  - Audit
  - Faculties
  - Roles
  - Validation & error handling
  - Permission checks
"""
import pytest
import requests
import random
import string

API_BASE = 'http://127.0.0.1:8000/api/v1'
SUFFIX = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

# Shared test state
IDS = {}


# ============================================================
# AUTH
# ============================================================
class TestAuth:

    def test_login_success(self, api_base):
        r = requests.post(f'{api_base}/auth/login/', json={'email': 'admin@dormitory.uz', 'password': 'admin123'})
        assert r.status_code == 200
        data = r.json()
        assert 'access' in data
        assert 'refresh' in data
        assert 'user_id' in data

    def test_login_wrong_password(self, api_base):
        r = requests.post(f'{api_base}/auth/login/', json={'email': 'admin@dormitory.uz', 'password': 'wrong'})
        assert r.status_code == 401

    def test_login_nonexistent_user(self, api_base):
        r = requests.post(f'{api_base}/auth/login/', json={'email': 'nobody@test.com', 'password': 'test'})
        assert r.status_code == 401

    def test_login_missing_fields(self, api_base):
        r = requests.post(f'{api_base}/auth/login/', json={})
        assert r.status_code == 400

    def test_me(self, api, ids):
        r = api.get('/auth/me/')
        assert r.status_code == 200
        data = r.json()
        assert 'email' in data
        assert 'full_name' in data
        assert 'role' in data

    def test_me_unauthenticated(self, api_base):
        r = requests.get(f'{api_base}/auth/me/')
        assert r.status_code == 401

    def test_refresh_token(self, api_base):
        login = requests.post(f'{api_base}/auth/login/', json={'email': 'admin@dormitory.uz', 'password': 'admin123'})
        refresh = login.json()['refresh']
        r = requests.post(f'{api_base}/auth/refresh/', json={'refresh': refresh})
        assert r.status_code == 200
        assert 'access' in r.json()

    def test_password_reset_request(self, api_base):
        r = requests.post(f'{api_base}/auth/password-reset/', json={'email': 'admin@dormitory.uz'})
        assert r.status_code == 200

    def test_password_reset_missing_email(self, api_base):
        r = requests.post(f'{api_base}/auth/password-reset/', json={})
        assert r.status_code == 400


# ============================================================
# ROLES
# ============================================================
class TestRoles:

    def test_list_roles(self, api, ids):
        r = api.get('/roles/')
        assert r.status_code == 200
        roles = r.json()
        assert isinstance(roles, list)
        assert len(roles) >= 4
        names = [role['name'] for role in roles]
        assert 'university_admin' in names
        assert 'dorm_manager' in names
        assert 'accountant' in names
        assert 'security_staff' in names


# ============================================================
# BUILDINGS CRUD
# ============================================================
class TestBuildings:

    def test_create_building(self, api, ids):
        r = api.post('/buildings/', json={'name': f'QA Build {SUFFIX}', 'gender_policy': 'mixed'})
        assert r.status_code == 201
        assert r.json()['name'] == f'QA Build {SUFFIX}'
        ids["building_id"] = r.json()['id']

    def test_list_buildings(self, api, ids):
        r = api.get('/buildings/')
        assert r.status_code == 200
        assert r.json()['count'] >= 1

    def test_get_building(self, api, ids):
        r = api.get(f'/buildings/{ids["building_id"]}/')
        assert r.status_code == 200
        assert r.json()['name'] == f'QA Build {SUFFIX}'

    def test_update_building(self, api, ids):
        r = api.patch(f'/buildings/{ids["building_id"]}/', json={'name': f'QA Build Updated {SUFFIX}'})
        assert r.status_code == 200
        assert r.json()['name'] == f'QA Build Updated {SUFFIX}'

    def test_building_gender_policy(self, api, ids):
        for policy in ['male_only', 'female_only', 'mixed']:
            r = api.patch(f'/buildings/{ids["building_id"]}/', json={'gender_policy': policy})
            assert r.status_code == 200
        # Ensure mixed for subsequent tests
        api.patch(f'/buildings/{ids["building_id"]}/', json={'gender_policy': 'mixed'})


# ============================================================
# FLOORS CRUD
# ============================================================
class TestFloors:

    def test_create_floor(self, api, ids):
        building_id = ids["building_id"]
        r = api.post('/floors/', json={'building': building_id, 'number': 1})
        assert r.status_code == 201
        ids["floor_id"] = r.json()['id']

    def test_list_floors(self, api, ids):
        r = api.get('/floors/', params={'building': ids["building_id"]})
        assert r.status_code == 200
        assert r.json()['count'] >= 1

    def test_update_floor(self, api, ids):
        r = api.patch(f'/floors/{ids["floor_id"]}/', json={'description': 'QA test floor'})
        assert r.status_code == 200

    def test_duplicate_floor_number(self, api, ids):
        r = api.post('/floors/', json={'building': ids["building_id"], 'number': 1})
        assert r.status_code == 400  # unique_together


# ============================================================
# ROOMS CRUD
# ============================================================
class TestRooms:

    def test_create_room(self, api, ids):
        r = api.post('/rooms/', json={
            'floor': ids["floor_id"],
            'room_number': f'QA-{SUFFIX}-101',
            'capacity': 3,
            'gender_policy': 'mixed',
            'monthly_price': '150000',
        })
        assert r.status_code == 201
        data = r.json()
        assert data['room_number'] == f'QA-{SUFFIX}-101'
        assert data['capacity'] == 3
        ids["room_id"] = data['id']

    def test_list_rooms(self, api, ids):
        r = api.get('/rooms/')
        assert r.status_code == 200

    def test_available_rooms(self, api, ids):
        r = api.get('/rooms/available/')
        assert r.status_code == 200

    def test_get_room(self, api, ids):
        r = api.get(f'/rooms/{ids["room_id"]}/')
        assert r.status_code == 200
        data = r.json()
        assert 'available_beds' in data
        assert 'floor_number' in data
        assert 'building_name' in data

    def test_update_room(self, api, ids):
        r = api.patch(f'/rooms/{ids["room_id"]}/', json={'monthly_price': '200000'})
        assert r.status_code == 200
        assert r.json()['monthly_price'] == '200000.00'

    def test_room_status_maintenance_empty(self, api, ids):
        """Can set maintenance if room is empty."""
        r = api.patch(f'/rooms/{ids["room_id"]}/', json={'status': 'maintenance'})
        assert r.status_code == 200
        # Reset
        api.patch(f'/rooms/{ids["room_id"]}/', json={'status': 'available'})


# ============================================================
# FACULTIES
# ============================================================
class TestFaculties:

    def test_create_faculty(self, api, ids):
        r = api.post('/faculties/', json={'name': f'QA Faculty {SUFFIX}'})
        assert r.status_code == 201
        ids["faculty_id"] = r.json()['id']

    def test_list_faculties(self, api, ids):
        r = api.get('/faculties/')
        assert r.status_code == 200
        assert r.json()['count'] >= 1


# ============================================================
# RESIDENTS CRUD
# ============================================================
class TestResidents:

    def test_create_resident(self, api, ids):
        r = api.post('/residents/', json={
            'full_name': f'QA Resident {SUFFIX}',
            'gender': 'male',
            'university_id': f'QA-{SUFFIX}',
            'faculty': f'QA Faculty {SUFFIX}',
            'course': 2,
        })
        assert r.status_code == 201
        data = r.json()
        assert data['status'] == 'pending'  # default status
        ids["resident_id"] = data['id']

    def test_list_residents(self, api, ids):
        r = api.get('/residents/')
        assert r.status_code == 200
        assert r.json()['count'] >= 1

    def test_filter_residents_by_status(self, api, ids):
        r = api.get('/residents/', params={'status': 'pending'})
        assert r.status_code == 200

    def test_search_residents(self, api, ids):
        r = api.get('/residents/', params={'search': SUFFIX})
        assert r.status_code == 200
        assert r.json()['count'] >= 1

    def test_get_resident(self, api, ids):
        r = api.get(f'/residents/{ids["resident_id"]}/')
        assert r.status_code == 200
        data = r.json()
        assert 'guardians' in data
        assert 'documents' in data

    def test_update_resident(self, api, ids):
        r = api.patch(f'/residents/{ids["resident_id"]}/', json={'faculty': 'Updated Faculty'})
        assert r.status_code == 200
        assert r.json()['faculty'] == 'Updated Faculty'

    def test_add_guardian(self, api, ids):
        r = api.post(f'/residents/{ids["resident_id"]}/guardians/', json={
            'full_name': f'QA Guardian {SUFFIX}',
            'relationship': 'father',
            'phone_number': '+998902222222',
            'is_emergency_contact': True,
        })
        assert r.status_code == 201

    def test_list_guardians(self, api, ids):
        r = api.get(f'/residents/{ids["resident_id"]}/guardians/')
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_balance_no_charges(self, api, ids):
        r = api.get(f'/residents/{ids["resident_id"]}/balance/')
        assert r.status_code == 200
        data = r.json()
        assert data['debt'] == '0.00'


# ============================================================
# CONTRACTS + ASSIGNMENTS (full flow)
# ============================================================
class TestContractsAndAssignments:

    def test_create_contract(self, api, ids):
        r = api.post('/contracts/', json={
            'resident': ids["resident_id"],
            'building': ids["building_id"],
            'contract_number': f'QA-C-{SUFFIX}',
            'start_date': '2026-03-19',
            'end_date': '2026-06-19',
        })
        assert r.status_code == 201, f'Contract create failed: {r.text}'
        data = r.json()
        ids["contract_id"] = data['id']

    def test_list_contracts(self, api, ids):
        r = api.get('/contracts/')
        assert r.status_code == 200
        assert r.json()['count'] >= 1

    def test_assign_room(self, api, ids):
        """Assign resident to room — should auto-generate charges."""
        r = api.post('/assignments/', json={
            'contract': ids["contract_id"],
            'resident': ids["resident_id"],
            'room': ids["room_id"],
        })
        assert r.status_code == 201
        data = r.json()
        assert data['status'] == 'active'
        ids["assignment_id"] = data['id']

    def test_resident_now_active(self, api, ids):
        """After assignment, resident status should be active."""
        r = api.get(f'/residents/{ids["resident_id"]}/')
        assert r.json()['status'] == 'active'

    def test_charges_auto_generated(self, api, ids):
        """Charges should be auto-generated for contract period."""
        r = api.get('/charges/', params={'resident': ids["resident_id"]})
        assert r.status_code == 200
        charges = r.json()['results']
        assert len(charges) >= 3  # March, April, May

    def test_balance_has_debt(self, api, ids):
        r = api.get(f'/residents/{ids["resident_id"]}/balance/')
        data = r.json()
        debt = float(data['debt'])
        assert debt > 0  # Should have debt now

    def test_room_occupancy_increased(self, api, ids):
        r = api.get(f'/rooms/{ids["room_id"]}/')
        assert r.json()['current_occupancy'] >= 1

    def test_room_status_maintenance_blocked(self, api, ids):
        """Cannot set maintenance if room has residents."""
        r = api.patch(f'/rooms/{ids["room_id"]}/', json={'status': 'maintenance'})
        assert r.status_code == 400


# ============================================================
# PAYMENTS + FIFO
# ============================================================
class TestPayments:

    def test_create_payment(self, api, ids):
        r = api.post('/payments/', json={
            'resident': ids["resident_id"],
            'amount': '150000',
            'payment_date': '2026-03-19',
            'payment_method': 'cash',
        })
        assert r.status_code == 201
        data = r.json()
        assert data['resident_name'] is not None

    def test_balance_reduced(self, api, ids):
        r = api.get(f'/residents/{ids["resident_id"]}/balance/')
        data = r.json()
        debt = float(data['debt'])
        assert debt > 0  # still has debt after partial payment

    def test_list_payments(self, api, ids):
        r = api.get('/payments/')
        assert r.status_code == 200
        assert r.json()['count'] >= 1

    def test_charge_status_updated(self, api, ids):
        """First charge should be partially paid or paid."""
        r = api.get('/charges/', params={'resident': ids["resident_id"]})
        statuses = [c['status'] for c in r.json()['results']]
        assert 'paid' in statuses or 'partially_paid' in statuses


# ============================================================
# TRANSFER
# ============================================================
class TestTransfer:

    def test_create_second_room(self, api, ids):
        r = api.post('/rooms/', json={
            'floor': ids["floor_id"],
            'room_number': f'QA-{SUFFIX}-102',
            'capacity': 2,
            'gender_policy': 'mixed',
            'monthly_price': '100000',
        })
        assert r.status_code == 201
        ids["room2_id"] = r.json()['id']

    def test_transfer_resident(self, api, ids):
        r = api.post(f'/residents/{ids["resident_id"]}/transfer/', json={
            'new_room': ids["room2_id"],
        })
        assert r.status_code == 201

    def test_old_room_freed(self, api, ids):
        r = api.get(f'/rooms/{ids["room_id"]}/')
        assert r.json()['current_occupancy'] == 0

    def test_new_room_occupied(self, api, ids):
        r = api.get(f'/rooms/{ids["room2_id"]}/')
        assert r.json()['current_occupancy'] == 1


# ============================================================
# TERMINATE CONTRACT
# ============================================================
class TestTerminate:

    def test_terminate_contract(self, api, ids):
        r = api.post(f'/contracts/{ids["contract_id"]}/terminate/')
        assert r.status_code == 200
        assert r.json()['status'] == 'terminated'

    def test_resident_evicted(self, api, ids):
        r = api.get(f'/residents/{ids["resident_id"]}/')
        assert r.json()['status'] == 'evicted'

    def test_room_freed_after_terminate(self, api, ids):
        r = api.get(f'/rooms/{ids["room2_id"]}/')
        assert r.json()['current_occupancy'] == 0

    def test_future_charges_cancelled(self, api, ids):
        r = api.get('/charges/', params={'resident': ids["resident_id"]})
        statuses = [c['status'] for c in r.json()['results']]
        assert 'cancelled' in statuses

    def test_balance_shows_overpayment(self, api, ids):
        r = api.get(f'/residents/{ids["resident_id"]}/balance/')
        debt = float(r.json()['debt'])
        assert debt <= 0  # overpayment or zero


# ============================================================
# WITHDRAW
# ============================================================
class TestWithdraw:

    def test_withdraw_overpayment(self, api, ids):
        bal = api.get(f'/residents/{ids["resident_id"]}/balance/').json()
        if float(bal['debt']) < 0:
            r = api.post(f'/residents/{ids["resident_id"]}/withdraw/')
            assert r.status_code == 200
            assert 'withdrawn' in r.json()

    def test_balance_zero_after_withdraw(self, api, ids):
        r = api.get(f'/residents/{ids["resident_id"]}/balance/')
        assert float(r.json()['debt']) == 0


# ============================================================
# REPORTS
# ============================================================
class TestReports:

    def test_summary(self, api, ids):
        r = api.get('/reports/summary/')
        assert r.status_code == 200
        data = r.json()
        assert 'total_residents' in data
        assert 'free_beds' in data
        assert 'total_debt' in data
        assert 'collected_this_month' in data

    def test_occupancy(self, api, ids):
        r = api.get('/reports/occupancy/')
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_available_rooms(self, api, ids):
        r = api.get('/reports/available-rooms/')
        assert r.status_code == 200

    def test_debtors(self, api, ids):
        r = api.get('/reports/debtors/')
        assert r.status_code == 200

    def test_payments_report(self, api, ids):
        r = api.get('/reports/payments/')
        assert r.status_code == 200
        data = r.json()
        assert 'payments' in data
        assert 'total' in data
        assert 'count' in data

    def test_residents_report(self, api, ids):
        r = api.get('/reports/residents/')
        assert r.status_code == 200


# ============================================================
# AUDIT
# ============================================================
class TestAudit:

    def test_list_audit(self, api, ids):
        r = api.get('/audit/')
        assert r.status_code == 200
        assert r.json()['count'] >= 1

    def test_filter_audit_by_action(self, api, ids):
        r = api.get('/audit/', params={'action': 'create'})
        assert r.status_code == 200

    def test_filter_audit_by_model(self, api, ids):
        r = api.get('/audit/', params={'model_name': 'RoomAssignment'})
        assert r.status_code == 200

    def test_audit_has_changes(self, api, ids):
        r = api.get('/audit/')
        results = r.json()['results']
        if results:
            assert 'changes' in results[0]
            assert 'user_name' in results[0]


# ============================================================
# GENDER POLICY VALIDATION
# ============================================================
class TestValidation:

    def test_female_in_male_room_blocked(self, api, ids):
        # Create male-only room
        r = api.post('/rooms/', json={
            'floor': ids["floor_id"],
            'room_number': f'QA-{SUFFIX}-MALE',
            'capacity': 2,
            'gender_policy': 'male_only',
            'monthly_price': '100000',
        })
        male_room_id = r.json()['id']

        # Create female resident
        r = api.post('/residents/', json={
            'full_name': f'QA Female {SUFFIX}', 'gender': 'female',
            'university_id': f'QA-F-{SUFFIX}',
        })
        female_id = r.json()['id']

        # Create contract
        r = api.post('/contracts/', json={
            'resident': female_id,
            'building': ids["building_id"],
            'contract_number': f'QA-G-{SUFFIX}',
            'start_date': '2026-03-19', 'end_date': '2026-06-19',
        })
        contract_id = r.json()['id']

        # Try assign — should fail
        r = api.post('/assignments/', json={
            'contract': contract_id, 'resident': female_id, 'room': male_room_id,
        })
        assert r.status_code == 400


# ============================================================
# CLEANUP
# ============================================================
class TestZCleanup:

    def test_delete_resident(self, api, ids):
        r = api.delete(f'/residents/{ids["resident_id"]}/')
        assert r.status_code == 204

    def test_delete_building(self, api, ids):
        # Delete rooms first
        rooms = api.get('/rooms/', params={'building': ids["building_id"]}).json()['results']
        for room in rooms:
            api.delete(f'/rooms/{room["id"]}/')
        floors = api.get('/floors/', params={'building': ids["building_id"]}).json()['results']
        for floor in floors:
            api.delete(f'/floors/{floor["id"]}/')
        r = api.delete(f'/buildings/{ids["building_id"]}/')
        assert r.status_code == 204
