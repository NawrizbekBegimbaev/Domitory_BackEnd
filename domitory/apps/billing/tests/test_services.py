import calendar
import pytest
from datetime import date
from decimal import Decimal

from apps.billing.models import Charge, Payment, PaymentAllocation
from apps.billing.services import BalanceService, ChargeService, PaymentService


@pytest.mark.django_db
class TestChargeService:

    def test_generate_charges_for_assignment(self, contract, room):
        created = ChargeService.generate_charges_for_assignment(contract, room)
        assert created >= 1
        charges = Charge.objects.filter(resident=contract.resident)
        assert charges.count() >= 1
        for c in charges:
            assert c.status == Charge.Status.PENDING
            assert c.amount > 0
            assert c.room == room

    def test_no_duplicate_charges(self, contract, room):
        ChargeService.generate_charges_for_assignment(contract, room)
        first_count = Charge.objects.filter(resident=contract.resident).count()
        ChargeService.generate_charges_for_assignment(contract, room)
        assert Charge.objects.filter(resident=contract.resident).count() == first_count

    def test_zero_price_no_charges(self, contract, room):
        room.monthly_price = Decimal('0')
        room.save()
        created = ChargeService.generate_charges_for_assignment(contract, room)
        assert created == 0

    def test_full_month_charge(self, resident, building, user, room):
        """Contract for full months → charges = monthly_price."""
        from apps.occupancy.models import AccommodationContract
        contract = AccommodationContract.objects.create(
            resident=resident, building=building,
            contract_number='C-FULL',
            start_date=date(2025, 3, 1),
            end_date=date(2025, 4, 30),
            status='active', created_by=user,
        )
        ChargeService.generate_charges_for_assignment(contract, room)
        march = Charge.objects.get(resident=resident, period_month=3, period_year=2025, room=room)
        april = Charge.objects.get(resident=resident, period_month=4, period_year=2025, room=room)
        assert march.amount == room.monthly_price
        assert march.is_prorated is False
        assert march.start_day == 1
        assert march.end_day == 31
        assert april.amount == room.monthly_price
        assert april.is_prorated is False

    def test_prorated_first_month(self, resident, building, user, room):
        """Contract starting March 15 → first month prorated."""
        from apps.occupancy.models import AccommodationContract
        contract = AccommodationContract.objects.create(
            resident=resident, building=building,
            contract_number='C-PRO1',
            start_date=date(2025, 3, 15),
            end_date=date(2025, 4, 30),
            status='active', created_by=user,
        )
        ChargeService.generate_charges_for_assignment(contract, room)
        march = Charge.objects.get(resident=resident, period_month=3, period_year=2025, room=room)
        # 17 days (15-31 March)
        expected = Charge.calculate_prorated_amount(room.monthly_price, 2025, 3, 15, 31)
        assert march.amount == expected
        assert march.is_prorated is True
        assert march.start_day == 15
        assert march.end_day == 31
        assert march.days_charged == 17

    def test_prorated_last_month(self, resident, building, user, room):
        """Contract ending March 15 → last month prorated."""
        from apps.occupancy.models import AccommodationContract
        contract = AccommodationContract.objects.create(
            resident=resident, building=building,
            contract_number='C-PRO2',
            start_date=date(2025, 3, 1),
            end_date=date(2025, 3, 15),
            status='active', created_by=user,
        )
        ChargeService.generate_charges_for_assignment(contract, room)
        march = Charge.objects.get(resident=resident, period_month=3, period_year=2025, room=room)
        expected = Charge.calculate_prorated_amount(room.monthly_price, 2025, 3, 1, 15)
        assert march.amount == expected
        assert march.is_prorated is True
        assert march.days_charged == 15

    def test_february_leap_year(self, resident, building, user, room):
        """February 2024 (leap year, 29 days) → correct calculation."""
        from apps.occupancy.models import AccommodationContract
        contract = AccommodationContract.objects.create(
            resident=resident, building=building,
            contract_number='C-FEB',
            start_date=date(2024, 2, 1),
            end_date=date(2024, 2, 29),
            status='active', created_by=user,
        )
        ChargeService.generate_charges_for_assignment(contract, room)
        feb = Charge.objects.get(resident=resident, period_month=2, period_year=2024, room=room)
        assert feb.amount == room.monthly_price  # Full month
        assert feb.days_charged == 29


@pytest.mark.django_db
class TestPaymentService:

    def _create_charge(self, resident, month, year, amount):
        return Charge.objects.create(
            resident=resident, period_month=month, period_year=year,
            amount=amount, due_date=date(year, month, 25),
        )

    def test_full_payment(self, resident, user):
        charge = self._create_charge(resident, 1, 2025, Decimal('500000'))
        payment = PaymentService.record_payment(
            resident=resident, amount=Decimal('500000'),
            payment_date=date.today(), payment_method='cash', recorded_by=user,
        )
        assert payment.pk is not None
        charge.refresh_from_db()
        assert charge.status == Charge.Status.PAID

    def test_partial_payment(self, resident, user):
        charge = self._create_charge(resident, 1, 2025, Decimal('500000'))
        PaymentService.record_payment(
            resident=resident, amount=Decimal('200000'),
            payment_date=date.today(), payment_method='cash', recorded_by=user,
        )
        charge.refresh_from_db()
        assert charge.status == Charge.Status.PARTIALLY_PAID

    def test_fifo_allocation(self, resident, user):
        jan = self._create_charge(resident, 1, 2025, Decimal('500000'))
        feb = self._create_charge(resident, 2, 2025, Decimal('500000'))
        PaymentService.record_payment(
            resident=resident, amount=Decimal('700000'),
            payment_date=date.today(), payment_method='cash', recorded_by=user,
        )
        jan.refresh_from_db()
        feb.refresh_from_db()
        assert jan.status == Charge.Status.PAID
        assert feb.status == Charge.Status.PARTIALLY_PAID

    def test_fifo_with_prorated_charges(self, resident, user, room):
        """FIFO allocates to prorated charges in order of start_day."""
        # Two charges in same month (transfer scenario)
        c1 = Charge.objects.create(
            resident=resident, room=room, period_month=3, period_year=2025,
            amount=Decimal('48387'), start_day=1, end_day=15, days_charged=15,
            is_prorated=True, due_date=date(2025, 3, 25),
        )
        c2 = Charge.objects.create(
            resident=resident, period_month=3, period_year=2025,
            amount=Decimal('103226'), start_day=16, end_day=31, days_charged=16,
            is_prorated=True, due_date=date(2025, 3, 25),
        )
        PaymentService.record_payment(
            resident=resident, amount=Decimal('100000'),
            payment_date=date.today(), payment_method='cash', recorded_by=user,
        )
        c1.refresh_from_db()
        c2.refresh_from_db()
        assert c1.status == Charge.Status.PAID  # 48387 fully covered
        assert c2.status == Charge.Status.PARTIALLY_PAID  # 51613 of 103226


@pytest.mark.django_db
class TestBalanceService:

    def test_no_charges(self, resident):
        balance = BalanceService.get_resident_balance(resident)
        assert balance['debt'] == Decimal('0')

    def test_unpaid_charge(self, resident):
        Charge.objects.create(
            resident=resident, period_month=1, period_year=2025,
            amount=Decimal('500000'), due_date=date(2025, 1, 25),
        )
        balance = BalanceService.get_resident_balance(resident)
        assert balance['debt'] == Decimal('500000')

    def test_fully_paid(self, resident, user):
        Charge.objects.create(
            resident=resident, period_month=1, period_year=2025,
            amount=Decimal('500000'), due_date=date(2025, 1, 25),
        )
        PaymentService.record_payment(
            resident=resident, amount=Decimal('500000'),
            payment_date=date.today(), payment_method='cash', recorded_by=user,
        )
        balance = BalanceService.get_resident_balance(resident)
        assert balance['debt'] == Decimal('0')
