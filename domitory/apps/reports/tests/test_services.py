import pytest
from datetime import date
from decimal import Decimal

from apps.billing.models import Charge, Payment, PaymentAllocation
from apps.billing.services import PaymentService
from apps.inventory.models import Building, Floor, Room
from apps.occupancy.models import AccommodationContract, RoomAssignment
from apps.reports.services import ReportService
from apps.residents.models import Resident


@pytest.mark.django_db
class TestSummaryReport:

    def test_returns_expected_keys(self, organization):
        result = ReportService.summary(organization)
        assert 'total_residents' in result
        assert 'free_beds' in result
        assert 'total_debt' in result
        assert 'collected_this_month' in result

    def test_counts_active_residents(self, organization, resident, female_resident):
        result = ReportService.summary(organization)
        assert result['total_residents'] == 2

    def test_excludes_evicted_residents(self, organization, resident):
        resident.status = Resident.Status.EVICTED
        resident.save()
        result = ReportService.summary(organization)
        assert result['total_residents'] == 0


@pytest.mark.django_db
class TestOccupancyReport:

    def test_returns_building_data(self, organization, building, floor, room):
        result = ReportService.occupancy(organization)
        assert len(result) == 1
        assert result[0]['building_name'] == building.name
        assert result[0]['capacity'] > 0

    def test_filter_by_building(self, organization, building, floor, room):
        result = ReportService.occupancy(organization, building_id=building.id)
        assert len(result) == 1

    def test_empty_for_other_org(self, db):
        from apps.organizations.models import Organization
        other_org = Organization.objects.create(name='Other Org')
        result = ReportService.occupancy(other_org)
        assert len(result) == 0


@pytest.mark.django_db
class TestAvailableRoomsReport:

    def test_returns_available_rooms(self, organization, room):
        result = list(ReportService.available_rooms(organization))
        assert len(result) == 1
        assert result[0]['room_number'] == '101'

    def test_excludes_full_rooms(self, organization, room):
        room.status = Room.Status.FULL
        room.save()
        result = list(ReportService.available_rooms(organization))
        assert len(result) == 0

    def test_filter_by_gender(self, organization, room, room_male_only):
        result = list(ReportService.available_rooms(organization, gender='male'))
        room_numbers = [r['room_number'] for r in result]
        assert '101' in room_numbers  # mixed
        assert '102' in room_numbers  # male_only


@pytest.mark.django_db
class TestDebtorsReport:

    def test_returns_residents_with_debt(self, organization, resident, tariff):
        Charge.objects.create(
            resident=resident,
            tariff_plan=tariff,
            period_month=1,
            period_year=2025,
            amount=Decimal('500000'),
            due_date=date(2025, 1, 25),
        )
        result = list(ReportService.debtors(organization))
        assert len(result) == 1
        assert result[0]['full_name'] == resident.full_name

    def test_excludes_fully_paid(self, organization, resident, tariff, user):
        charge = Charge.objects.create(
            resident=resident,
            tariff_plan=tariff,
            period_month=1,
            period_year=2025,
            amount=Decimal('500000'),
            due_date=date(2025, 1, 25),
        )
        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('500000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        result = list(ReportService.debtors(organization))
        assert len(result) == 0


@pytest.mark.django_db
class TestPaymentsReport:

    def test_returns_payment_data(self, organization, resident, user):
        Payment.objects.create(
            resident=resident,
            amount=Decimal('100000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        result = ReportService.payments_report(organization)
        assert result['count'] == 1
        assert result['total'] == Decimal('100000')
        assert len(result['payments']) == 1

    def test_filter_by_method(self, organization, resident, user):
        Payment.objects.create(
            resident=resident,
            amount=Decimal('100000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        Payment.objects.create(
            resident=resident,
            amount=Decimal('200000'),
            payment_date=date.today(),
            payment_method='bank_transfer',
            recorded_by=user,
        )
        result = ReportService.payments_report(organization, method='cash')
        assert result['count'] == 1
        assert result['total'] == Decimal('100000')


@pytest.mark.django_db
class TestResidentsReport:

    def test_returns_all_residents(self, organization, resident, female_resident):
        result = list(ReportService.residents_report(organization))
        assert len(result) == 2

    def test_filter_by_gender(self, organization, resident, female_resident):
        result = list(ReportService.residents_report(organization, gender='male'))
        assert len(result) == 1
        assert result[0]['full_name'] == resident.full_name

    def test_filter_by_status(self, organization, resident):
        resident.status = Resident.Status.EVICTED
        resident.save()
        result = list(ReportService.residents_report(organization, status_filter='evicted'))
        assert len(result) == 1
