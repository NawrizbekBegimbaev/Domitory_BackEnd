import pytest
from datetime import date
from decimal import Decimal
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role, User
from apps.billing.models import Charge


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def accountant_user(db, role_accountant):
    return User.objects.create_user(
        email='accountant@test.com', password='testpass123',
        full_name='Test Accountant', role=role_accountant,
    )


@pytest.fixture
def accountant_client(api_client, accountant_user):
    api_client.force_authenticate(user=accountant_user)
    return api_client


@pytest.mark.django_db
class TestChargeViewSet:

    def test_list_charges(self, accountant_client, resident):
        Charge.objects.create(
            resident=resident, period_month=1, period_year=2025,
            amount=Decimal('500000'), due_date=date(2025, 1, 25),
        )
        response = accountant_client.get('/api/v1/charges/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1


@pytest.mark.django_db
class TestPaymentViewSet:

    def test_create_payment(self, accountant_client, resident):
        Charge.objects.create(
            resident=resident, period_month=1, period_year=2025,
            amount=Decimal('500000'), due_date=date(2025, 1, 25),
        )
        response = accountant_client.post('/api/v1/payments/', {
            'resident': str(resident.pk), 'amount': '500000.00',
            'payment_date': str(date.today()), 'payment_method': 'cash',
        })
        assert response.status_code == status.HTTP_201_CREATED
