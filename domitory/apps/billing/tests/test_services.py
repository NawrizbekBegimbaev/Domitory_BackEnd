import pytest
from datetime import date
from decimal import Decimal

from apps.billing.models import Charge, Payment, PaymentAllocation
from apps.billing.services import BalanceService, ChargeService, PaymentService
from apps.audit.models import AuditLog


@pytest.mark.django_db
class TestChargeService:

    def test_generate_charges_for_assignment(self, contract, room):
        created = ChargeService.generate_charges_for_assignment(contract, room)
        assert created >= 1
        charges = Charge.objects.filter(resident=contract.resident)
        assert charges.count() >= 1
        for c in charges:
            assert c.amount == room.monthly_price
            assert c.status == Charge.Status.PENDING

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
