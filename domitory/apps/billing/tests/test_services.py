import pytest
from datetime import date
from decimal import Decimal

from apps.billing.models import Charge, Payment, PaymentAllocation
from apps.billing.services import BalanceService, ChargeService, PaymentService
from apps.residents.models import Resident
from apps.audit.models import AuditLog


@pytest.mark.django_db
class TestChargeService:

    def test_generate_charges_for_active_residents(self, organization, tariff, resident):
        result = ChargeService.generate_monthly_charges(organization, tariff, 3, 2025)
        assert result['created'] == 1
        assert result['skipped'] == 0

        charge = Charge.objects.get(resident=resident, period_month=3, period_year=2025)
        assert charge.amount == tariff.amount
        assert charge.status == Charge.Status.PENDING

    def test_skips_existing_charges(self, organization, tariff, resident):
        ChargeService.generate_monthly_charges(organization, tariff, 3, 2025)
        result = ChargeService.generate_monthly_charges(organization, tariff, 3, 2025)
        assert result['created'] == 0
        assert result['skipped'] == 1
        assert Charge.objects.filter(resident=resident, period_month=3, period_year=2025).count() == 1

    def test_skips_non_active_residents(self, organization, tariff, resident):
        resident.status = Resident.Status.EVICTED
        resident.save()
        result = ChargeService.generate_monthly_charges(organization, tariff, 3, 2025)
        assert result['created'] == 0

    def test_generates_for_multiple_residents(self, organization, tariff, resident, female_resident):
        result = ChargeService.generate_monthly_charges(organization, tariff, 3, 2025)
        assert result['created'] == 2


@pytest.mark.django_db
class TestPaymentService:

    def _create_charge(self, resident, tariff, month, year, amount=None):
        return Charge.objects.create(
            resident=resident,
            tariff_plan=tariff,
            period_month=month,
            period_year=year,
            amount=amount or tariff.amount,
            due_date=date(year, month, 25),
        )

    def test_full_payment_single_charge(self, resident, tariff, user):
        charge = self._create_charge(resident, tariff, 1, 2025)
        payment = PaymentService.record_payment(
            resident=resident,
            amount=Decimal('500000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        assert payment.pk is not None
        assert payment.amount == Decimal('500000')

        charge.refresh_from_db()
        assert charge.status == Charge.Status.PAID

        assert PaymentAllocation.objects.filter(payment=payment, charge=charge).exists()
        alloc = PaymentAllocation.objects.get(payment=payment, charge=charge)
        assert alloc.amount == Decimal('500000')

        assert AuditLog.objects.filter(action='create', model_name='Payment').exists()

    def test_partial_payment(self, resident, tariff, user):
        charge = self._create_charge(resident, tariff, 1, 2025)
        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('200000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        charge.refresh_from_db()
        assert charge.status == Charge.Status.PARTIALLY_PAID

    def test_fifo_allocation(self, resident, tariff, user):
        jan = self._create_charge(resident, tariff, 1, 2025)
        feb = self._create_charge(resident, tariff, 2, 2025)

        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('700000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )

        jan.refresh_from_db()
        feb.refresh_from_db()
        assert jan.status == Charge.Status.PAID
        assert feb.status == Charge.Status.PARTIALLY_PAID

        feb_alloc = PaymentAllocation.objects.get(charge=feb)
        assert feb_alloc.amount == Decimal('200000')

    def test_overpayment_covers_all_charges(self, resident, tariff, user):
        jan = self._create_charge(resident, tariff, 1, 2025)
        feb = self._create_charge(resident, tariff, 2, 2025)

        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('1200000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )

        jan.refresh_from_db()
        feb.refresh_from_db()
        assert jan.status == Charge.Status.PAID
        assert feb.status == Charge.Status.PAID

    def test_payment_with_no_charges(self, resident, user):
        payment = PaymentService.record_payment(
            resident=resident,
            amount=Decimal('100000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        assert payment.pk is not None
        assert PaymentAllocation.objects.filter(payment=payment).count() == 0

    def test_second_payment_continues_fifo(self, resident, tariff, user):
        charge = self._create_charge(resident, tariff, 1, 2025)
        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('200000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        charge.refresh_from_db()
        assert charge.status == Charge.Status.PARTIALLY_PAID

        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('300000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        charge.refresh_from_db()
        assert charge.status == Charge.Status.PAID


@pytest.mark.django_db
class TestBalanceService:

    def _create_charge(self, resident, tariff, month, year, amount=None):
        return Charge.objects.create(
            resident=resident,
            tariff_plan=tariff,
            period_month=month,
            period_year=year,
            amount=amount or tariff.amount,
            due_date=date(year, month, 25),
        )

    def test_no_charges(self, resident):
        balance = BalanceService.get_resident_balance(resident)
        assert balance['debt'] == Decimal('0')
        assert balance['total_charges'] == Decimal('0')
        assert balance['total_paid'] == Decimal('0')

    def test_unpaid_charge(self, resident, tariff):
        self._create_charge(resident, tariff, 1, 2025)
        balance = BalanceService.get_resident_balance(resident)
        assert balance['debt'] == Decimal('500000')
        assert balance['total_charges'] == Decimal('500000')

    def test_partially_paid(self, resident, tariff, user):
        self._create_charge(resident, tariff, 1, 2025)
        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('200000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        balance = BalanceService.get_resident_balance(resident)
        assert balance['debt'] == Decimal('300000')

    def test_fully_paid(self, resident, tariff, user):
        self._create_charge(resident, tariff, 1, 2025)
        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('500000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        balance = BalanceService.get_resident_balance(resident)
        assert balance['debt'] == Decimal('0')

    def test_multiple_charges_partial_payment(self, resident, tariff, user):
        self._create_charge(resident, tariff, 1, 2025)
        self._create_charge(resident, tariff, 2, 2025)
        PaymentService.record_payment(
            resident=resident,
            amount=Decimal('500000'),
            payment_date=date.today(),
            payment_method='cash',
            recorded_by=user,
        )
        balance = BalanceService.get_resident_balance(resident)
        assert balance['debt'] == Decimal('500000')
