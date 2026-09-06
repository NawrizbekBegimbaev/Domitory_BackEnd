"""Multi-university isolation and the read-only ministry role."""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.inventory.models import Building, Floor, Room
from apps.residents.models import Faculty, Resident
from apps.universities.models import University


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def other_building(db, other_university):
    return Building.objects.create(university=other_university, name='Other B', gender_policy='mixed')


@pytest.fixture
def other_resident(db, other_university):
    return Resident.objects.create(
        university=other_university, full_name='Other Student', gender='male',
        student_number='OTH-1', faculty='Law', course=1,
    )


@pytest.fixture
def ministry_user(db):
    role = Role.objects.get_or_create(name='ministry')[0]
    return User.objects.create_user(email='ministry@test.com', password='testpass123', full_name='Ministry', role=role)


@pytest.fixture
def platform_admin(db):
    role = Role.objects.get_or_create(name='platform_admin')[0]
    return User.objects.create_user(email='root@test.com', password='testpass123', full_name='Root', role=role)


@pytest.fixture
def admin_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def ministry_client(api_client, ministry_user):
    api_client.force_authenticate(user=ministry_user)
    return api_client


@pytest.fixture
def root_client(api_client, platform_admin):
    api_client.force_authenticate(user=platform_admin)
    return api_client


@pytest.mark.django_db
class TestIsolation:

    def test_admin_sees_only_own_buildings(self, admin_client, building, other_building):
        r = admin_client.get('/api/v1/buildings/')
        ids = [b['id'] for b in r.data['results']]
        assert str(building.id) in ids
        assert str(other_building.id) not in ids

    def test_admin_cannot_open_other_resident(self, admin_client, resident, other_resident):
        assert admin_client.get(f'/api/v1/residents/{resident.id}/').status_code == 200
        assert admin_client.get(f'/api/v1/residents/{other_resident.id}/').status_code == 404

    def test_created_building_gets_own_university(self, admin_client, university):
        r = admin_client.post('/api/v1/buildings/', {'name': 'New', 'gender_policy': 'mixed'})
        assert r.status_code == 201
        assert Building.objects.get(pk=r.data['id']).university == university

    def test_cannot_add_floor_to_foreign_building(self, admin_client, other_building):
        r = admin_client.post('/api/v1/floors/', {'building': str(other_building.id), 'number': 1})
        assert r.status_code in (403, 400)

    def test_created_resident_gets_own_university(self, admin_client, university):
        r = admin_client.post('/api/v1/residents/', {
            'full_name': 'New Student', 'gender': 'male', 'university_id': 'N-1', 'citizenship': 'kz',
        })
        assert r.status_code == 201
        res = Resident.objects.get(pk=r.data['id'])
        assert res.university == university
        assert res.citizenship == 'KZ' and res.is_foreign

    def test_faculty_unique_per_university(self, university, other_university):
        Faculty.objects.create(university=university, name='CS')
        Faculty.objects.create(university=other_university, name='CS')  # same name, other tenant: fine
        assert Faculty.objects.filter(name='CS').count() == 2

    def test_summary_is_scoped(self, admin_client, resident, other_resident):
        resident.status = 'active'; resident.save()
        other_resident.status = 'active'; other_resident.save()
        r = admin_client.get('/api/v1/reports/summary/')
        assert r.data['total_residents'] == 1

    def test_assignment_rejects_room_of_other_university(self, resident, contract, other_building, user):
        from django.core.exceptions import ValidationError
        from apps.occupancy.services import RoomAssignmentService
        floor = Floor.objects.create(building=other_building, number=1)
        room = Room.objects.create(floor=floor, room_number='1', capacity=2, monthly_price=1)
        with pytest.raises(ValidationError, match='другому университету'):
            RoomAssignmentService.assign_resident_to_room(resident, room, contract, user)


@pytest.mark.django_db
class TestMinistry:

    def test_sees_all_residents(self, ministry_client, resident, other_resident):
        r = ministry_client.get('/api/v1/residents/')
        assert r.data['count'] == 2

    def test_can_narrow_by_university(self, ministry_client, resident, other_resident, other_university):
        r = ministry_client.get(f'/api/v1/residents/?university={other_university.id}')
        assert r.data['count'] == 1
        assert r.data['results'][0]['id'] == str(other_resident.id)

    def test_cannot_write(self, ministry_client, resident, university):
        assert ministry_client.post('/api/v1/buildings/', {'name': 'X', 'university': str(university.id)}).status_code == 403
        assert ministry_client.patch(f'/api/v1/residents/{resident.id}/', {'full_name': 'Hacked'}).status_code == 403
        assert ministry_client.delete(f'/api/v1/residents/{resident.id}/').status_code == 403
        assert ministry_client.post('/api/v1/payments/', {'resident': str(resident.id), 'amount': '1', 'payment_date': '2026-01-01', 'payment_method': 'cash'}).status_code == 403

    def test_can_read_payments(self, ministry_client):
        assert ministry_client.get('/api/v1/payments/').status_code == 200

    def test_overview(self, ministry_client, resident, other_resident, building, other_building):
        resident.status = 'active'; resident.save()
        r = ministry_client.get('/api/v1/reports/universities/')
        assert r.status_code == 200
        assert r.data['totals']['universities'] == 2
        assert r.data['totals']['total_residents'] == 1
        names = {u['university_name'] for u in r.data['universities']}
        assert names == {'Test University', 'Other University'}

    def test_overview_forbidden_for_university_admin(self, admin_client):
        assert admin_client.get('/api/v1/reports/universities/').status_code == 403

    def test_cannot_manage_users(self, ministry_client):
        assert ministry_client.get('/api/v1/users/').status_code == 403


@pytest.mark.django_db
class TestUniversitiesApi:

    def test_platform_admin_crud(self, root_client):
        r = root_client.post('/api/v1/universities/', {'name': 'TUIT', 'short_name': 'TUIT', 'city': 'Tashkent'})
        assert r.status_code == 201
        assert University.objects.filter(name='TUIT').exists()

    def test_university_admin_cannot_create(self, admin_client):
        assert admin_client.post('/api/v1/universities/', {'name': 'X'}).status_code == 403

    def test_university_admin_sees_only_own(self, admin_client, university, other_university):
        r = admin_client.get('/api/v1/universities/')
        assert [u['id'] for u in r.data['results']] == [str(university.id)]

    def test_platform_admin_must_pass_university_for_building(self, root_client, university):
        assert root_client.post('/api/v1/buildings/', {'name': 'NoUni'}).status_code == 403
        r = root_client.post('/api/v1/buildings/', {'name': 'WithUni', 'university': str(university.id)})
        assert r.status_code == 201


@pytest.mark.django_db
class TestUserCreation:

    def test_university_admin_creates_user_in_own_university(self, admin_client, role_manager, university):
        r = admin_client.post('/api/v1/users/', {
            'email': 'new@test.com', 'full_name': 'New', 'password': 'testpass123', 'role': role_manager.id,
        })
        assert r.status_code == 201
        assert User.objects.get(email='new@test.com').university == university

    def test_university_admin_cannot_create_ministry(self, admin_client):
        role = Role.objects.get_or_create(name='ministry')[0]
        r = admin_client.post('/api/v1/users/', {
            'email': 'm@test.com', 'full_name': 'M', 'password': 'testpass123', 'role': role.id,
        })
        assert r.status_code == 403

    def test_platform_admin_creates_ministry_without_university(self, root_client):
        role = Role.objects.get_or_create(name='ministry')[0]
        r = root_client.post('/api/v1/users/', {
            'email': 'm@test.com', 'full_name': 'M', 'password': 'testpass123', 'role': role.id,
            'passport_number': 'AA1234567', 'position': 'Главный специалист',
        })
        assert r.status_code == 201
        u = User.objects.get(email='m@test.com')
        assert u.university is None
        assert u.passport_number == 'AA1234567' and u.position == 'Главный специалист'
        assert r.data['passport_number'] == 'AA1234567'

    def test_platform_admin_needs_university_for_scoped_role(self, root_client, role_manager, university):
        r = root_client.post('/api/v1/users/', {
            'email': 'x@test.com', 'full_name': 'X', 'password': 'testpass123', 'role': role_manager.id,
        })
        assert r.status_code == 400
        r = root_client.post('/api/v1/users/', {
            'email': 'x@test.com', 'full_name': 'X', 'password': 'testpass123', 'role': role_manager.id,
            'university': str(university.id),
        })
        assert r.status_code == 201

    def test_me_includes_university(self, admin_client, university):
        r = admin_client.get('/api/v1/auth/me/')
        assert r.data['university']['id'] == str(university.id)


@pytest.mark.django_db
class TestPlatformAdminScope:

    def test_scope_param_used_for_create(self, root_client, university, role_manager):
        r = root_client.post(f'/api/v1/buildings/?university={university.id}', {'name': 'Scoped'})
        assert r.status_code == 201
        assert Building.objects.get(pk=r.data['id']).university == university
        r = root_client.post(f'/api/v1/users/?university={university.id}', {
            'email': 'scoped@test.com', 'full_name': 'S', 'password': 'testpass123', 'role': role_manager.id,
        })
        assert r.status_code == 201
        assert User.objects.get(email='scoped@test.com').university == university
