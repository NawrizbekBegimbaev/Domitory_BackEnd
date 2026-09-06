import pytest
from datetime import date
from decimal import Decimal

from apps.billing.models import Charge, Payment
from apps.billing.services import PaymentService
from apps.inventory.models import Room
from apps.reports.services import ReportService
from apps.residents.models import Resident


@pytest.mark.django_db
class TestSummaryReport:

    def test_returns_expected_keys(self, db):
        result = ReportService.summary()
        assert 'total_residents' in result
        assert 'free_beds' in result
        assert 'total_debt' in result

    def test_counts_active_residents(self, resident, female_resident):
        resident.status = 'active'; resident.save()
        female_resident.status = 'active'; female_resident.save()
        result = ReportService.summary()
        assert result['total_residents'] == 2

    def test_excludes_evicted_residents(self, resident):
        resident.status = Resident.Status.EVICTED
        resident.save()
        result = ReportService.summary()
        assert result['total_residents'] == 0


@pytest.mark.django_db
class TestOccupancyReport:

    def test_returns_building_data(self, building, floor, room):
        result = ReportService.occupancy()
        assert len(result) == 1
        assert result[0]['building_name'] == building.name

    def test_filter_by_building(self, building, floor, room):
        result = ReportService.occupancy(building_id=building.id)
        assert len(result) == 1


@pytest.mark.django_db
class TestAvailableRoomsReport:

    def test_returns_available_rooms(self, room):
        result = list(ReportService.available_rooms())
        assert len(result) == 1

    def test_excludes_full_rooms(self, room):
        room.status = Room.Status.FULL
        room.save()
        result = list(ReportService.available_rooms())
        assert len(result) == 0

    def test_filter_by_gender(self, room, room_male_only):
        result = list(ReportService.available_rooms(gender='male'))
        room_numbers = [r['room_number'] for r in result]
        assert '101' in room_numbers
        assert '102' in room_numbers


@pytest.mark.django_db
class TestDebtorsReport:

    def test_returns_residents_with_debt(self, resident, tariff):
        resident.status = 'active'; resident.save()
        Charge.objects.create(
            resident=resident, tariff_plan=tariff,
            period_month=1, period_year=2025,
            amount=Decimal('500000'), due_date=date(2025, 1, 25),
        )
        result = list(ReportService.debtors())
        assert len(result) == 1

    def test_excludes_fully_paid(self, resident, tariff, user):
        Charge.objects.create(
            resident=resident, tariff_plan=tariff,
            period_month=1, period_year=2025,
            amount=Decimal('500000'), due_date=date(2025, 1, 25),
        )
        PaymentService.record_payment(
            resident=resident, amount=Decimal('500000'),
            payment_date=date.today(), payment_method='cash', recorded_by=user,
        )
        result = list(ReportService.debtors())
        assert len(result) == 0


@pytest.mark.django_db
class TestPaymentsReport:

    def test_returns_payment_data(self, resident, user):
        Payment.objects.create(
            resident=resident, amount=Decimal('100000'),
            payment_date=date.today(), payment_method='cash', recorded_by=user,
        )
        result = ReportService.payments_report()
        assert result['count'] == 1

    def test_filter_by_method(self, resident, user):
        Payment.objects.create(resident=resident, amount=Decimal('100000'), payment_date=date.today(), payment_method='cash', recorded_by=user)
        Payment.objects.create(resident=resident, amount=Decimal('200000'), payment_date=date.today(), payment_method='bank_transfer', recorded_by=user)
        result = ReportService.payments_report(method='cash')
        assert result['count'] == 1


@pytest.mark.django_db
class TestResidentsReport:

    def test_returns_all_residents(self, resident, female_resident):
        result = list(ReportService.residents_report())
        assert len(result) == 2

    def test_filter_by_gender(self, resident, female_resident):
        result = list(ReportService.residents_report(gender='male'))
        assert len(result) == 1

    def test_filter_by_status(self, resident):
        resident.status = Resident.Status.EVICTED
        resident.save()
        result = list(ReportService.residents_report(status_filter='evicted'))
        assert len(result) == 1


@pytest.mark.django_db
class TestPeriodRange:

    def test_month(self):
        from apps.reports.services import period_range
        assert period_range('month', date(2026, 2, 10)) == (date(2026, 2, 1), date(2026, 2, 28))
        assert period_range('month', date(2026, 12, 10)) == (date(2026, 12, 1), date(2026, 12, 31))

    def test_quarter(self):
        from apps.reports.services import period_range
        assert period_range('quarter', date(2026, 9, 6)) == (date(2026, 7, 1), date(2026, 9, 30))
        assert period_range('quarter', date(2026, 11, 1)) == (date(2026, 10, 1), date(2026, 12, 31))
        assert period_range('quarter', date(2026, 1, 1)) == (date(2026, 1, 1), date(2026, 3, 31))

    def test_year(self):
        from apps.reports.services import period_range
        assert period_range('year', date(2026, 9, 6)) == (date(2026, 1, 1), date(2026, 12, 31))


@pytest.mark.django_db
class TestCollectedTotals:

    def _pay(self, resident, user, amount, when):
        Payment.objects.create(
            resident=resident, amount=Decimal(amount), payment_date=when,
            payment_method='cash', status=Payment.Status.COMPLETED, recorded_by=user,
        )

    def test_summary_has_quarter_and_year(self, resident, user):
        today = date.today()
        self._pay(resident, user, '100000', today)
        result = ReportService.summary()
        assert result['collected_this_month'] == Decimal('100000')
        assert result['collected_this_quarter'] == Decimal('100000')
        assert result['collected_this_year'] == Decimal('100000')

    def test_payments_report_period_filter(self, resident, user):
        today = date.today()
        self._pay(resident, user, '50000', today)
        self._pay(resident, user, '70000', date(today.year - 1, 6, 1))
        result = ReportService.payments_report(period='year')
        assert result['count'] == 1
        assert result['total'] == Decimal('50000')
        assert result['period'] == 'year'
        assert result['by_method'][0]['payment_method'] == 'cash'
