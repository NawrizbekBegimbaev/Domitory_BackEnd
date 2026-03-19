import pytest
from datetime import date, timedelta
from decimal import Decimal

from apps.accounts.models import Role, User
from apps.inventory.models import Building, Floor, Room
from apps.residents.models import Resident
from apps.occupancy.models import AccommodationContract
from apps.billing.models import TariffPlan


@pytest.fixture
def role_admin(db):
    return Role.objects.create(name='university_admin')


@pytest.fixture
def role_manager(db):
    return Role.objects.create(name='dorm_manager')


@pytest.fixture
def role_accountant(db):
    return Role.objects.create(name='accountant')


@pytest.fixture
def user(db, role_admin):
    return User.objects.create_user(
        email='admin@test.com',
        password='testpass123',
        full_name='Test Admin',
        role=role_admin,
    )


@pytest.fixture
def manager_user(db, role_manager):
    return User.objects.create_user(
        email='manager@test.com',
        password='testpass123',
        full_name='Test Manager',
        role=role_manager,
    )


@pytest.fixture
def building(db):
    return Building.objects.create(
        name='Building A',
        gender_policy='mixed',
    )


@pytest.fixture
def floor(db, building):
    return Floor.objects.create(building=building, number=1)


@pytest.fixture
def room(db, floor):
    return Room.objects.create(
        floor=floor,
        room_number='101',
        capacity=4,
        current_occupancy=0,
        gender_policy='mixed',
        monthly_price=Decimal('500000'),
    )


@pytest.fixture
def room_male_only(db, floor):
    return Room.objects.create(
        floor=floor,
        room_number='102',
        capacity=2,
        current_occupancy=0,
        gender_policy='male_only',
        monthly_price=Decimal('500000'),
    )


@pytest.fixture
def resident(db):
    return Resident.objects.create(
        full_name='John Doe',
        gender='male',
        university_id='STU001',
        faculty='CS',
        course=2,
    )


@pytest.fixture
def female_resident(db):
    return Resident.objects.create(
        full_name='Jane Doe',
        gender='female',
        university_id='STU002',
        faculty='CS',
        course=2,
    )


@pytest.fixture
def contract(db, resident, building, user):
    return AccommodationContract.objects.create(
        resident=resident,
        building=building,
        contract_number='C-001',
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365),
        status='active',
        created_by=user,
    )


@pytest.fixture
def tariff(db):
    return TariffPlan.objects.create(
        name='Standard',
        amount=Decimal('500000'),
        billing_period='monthly',
    )
