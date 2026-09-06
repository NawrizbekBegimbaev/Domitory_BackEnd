import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.admission.models import AdmissionCampaign, Booking, BookingWindow, PlacementRule
from apps.inventory.models import Building, Floor, Room


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def manager_client(api_client, manager_user):
    api_client.force_authenticate(user=manager_user)
    return api_client


@pytest.fixture
def ministry_client(api_client):
    role = Role.objects.get_or_create(name='ministry')[0]
    u = User.objects.create_user(email='m@test.com', password='testpass123', full_name='M', role=role)
    api_client.force_authenticate(user=u)
    return api_client


@pytest.fixture
def campaign(db, university):
    return AdmissionCampaign.objects.create(
        university=university, name='2026/2027', academic_year='2026/2027',
        start_date=datetime.date(2026, 9, 1), end_date=datetime.date(2027, 6, 30), is_active=True,
    )


@pytest.fixture
def other_campaign(db, other_university):
    return AdmissionCampaign.objects.create(
        university=other_university, name='Other', academic_year='2026/2027',
        start_date=datetime.date(2026, 9, 1), end_date=datetime.date(2027, 6, 30), is_active=True,
    )


@pytest.mark.django_db
class TestCampaignApi:

    def test_admin_creates_campaign_in_own_university(self, admin_client, university):
        r = admin_client.post('/api/v1/admission/campaigns/', {
            'name': 'Заселение 2026', 'academic_year': '2026/2027',
            'start_date': '2026-09-01', 'end_date': '2027-06-30',
        })
        assert r.status_code == 201
        assert AdmissionCampaign.objects.get(pk=r.data['id']).university == university

    def test_manager_cannot_create(self, manager_client):
        r = manager_client.post('/api/v1/admission/campaigns/', {
            'name': 'X', 'academic_year': '2026/2027', 'start_date': '2026-09-01', 'end_date': '2027-06-30',
        })
        assert r.status_code == 403

    def test_manager_can_read(self, manager_client, campaign):
        assert manager_client.get('/api/v1/admission/campaigns/').data['count'] == 1

    def test_scoped(self, admin_client, campaign, other_campaign):
        r = admin_client.get('/api/v1/admission/campaigns/')
        assert [c['id'] for c in r.data['results']] == [str(campaign.id)]
        assert admin_client.get(f'/api/v1/admission/campaigns/{other_campaign.id}/').status_code == 404

    def test_activate(self, admin_client, campaign, university):
        other = AdmissionCampaign.objects.create(
            university=university, name='Old', academic_year='2025/2026',
            start_date=datetime.date(2025, 9, 1), end_date=datetime.date(2026, 6, 30),
        )
        r = admin_client.post(f'/api/v1/admission/campaigns/{other.id}/activate/')
        assert r.status_code == 200 and r.data['is_active']
        campaign.refresh_from_db()
        assert not campaign.is_active
        assert admin_client.get('/api/v1/admission/campaigns/active/').data['id'] == str(other.id)

    def test_end_before_start_rejected(self, admin_client):
        r = admin_client.post('/api/v1/admission/campaigns/', {
            'name': 'X', 'academic_year': '2026/2027', 'start_date': '2027-09-01', 'end_date': '2026-06-30',
        })
        assert r.status_code == 400

    def test_ministry_read_only(self, ministry_client, campaign):
        assert ministry_client.get('/api/v1/admission/campaigns/').status_code == 200
        assert ministry_client.post(f'/api/v1/admission/campaigns/{campaign.id}/activate/').status_code == 403


@pytest.mark.django_db
class TestChildrenApi:

    def test_window_crud(self, admin_client, campaign):
        r = admin_client.post('/api/v1/admission/windows/', {
            'campaign': str(campaign.id), 'name': 'Курс 1', 'opens_at': '2026-09-01T09:00:00+05:00',
            'courses': [1], 'faculties': [], 'foreign_policy': 'any',
        }, format='json')
        assert r.status_code == 201, r.data
        assert r.data['criteria_display'] == 'курс 1'
        r = admin_client.get(f'/api/v1/admission/windows/?campaign={campaign.id}')
        assert r.data['count'] == 1

    def test_cannot_add_window_to_foreign_campaign(self, admin_client, other_campaign):
        r = admin_client.post('/api/v1/admission/windows/', {
            'campaign': str(other_campaign.id), 'opens_at': '2026-09-01T09:00:00+05:00',
        }, format='json')
        assert r.status_code in (400, 403)

    def test_rule_requires_one_scope(self, admin_client, campaign, building, floor):
        r = admin_client.post('/api/v1/admission/rules/', {'campaign': str(campaign.id), 'faculties': ['CS']}, format='json')
        assert r.status_code == 400
        r = admin_client.post('/api/v1/admission/rules/', {
            'campaign': str(campaign.id), 'building': str(building.id), 'floor': str(floor.id), 'faculties': ['CS'],
        }, format='json')
        assert r.status_code == 400
        r = admin_client.post('/api/v1/admission/rules/', {
            'campaign': str(campaign.id), 'floor': str(floor.id), 'faculties': ['CS'],
        }, format='json')
        assert r.status_code == 201 and r.data['level'] == 'floor'

    def test_rule_scope_must_be_same_university(self, admin_client, campaign, other_university):
        b = Building.objects.create(university=other_university, name='Z')
        r = admin_client.post('/api/v1/admission/rules/', {
            'campaign': str(campaign.id), 'building': str(b.id), 'faculties': ['CS'],
        }, format='json')
        assert r.status_code in (400, 403)

    def test_building_order(self, admin_client, campaign, building):
        r = admin_client.post('/api/v1/admission/building-order/', {
            'campaign': str(campaign.id), 'building': str(building.id), 'priority': 1,
            'floor_direction': 'custom', 'floor_order': [4, 3, 2, 1],
        }, format='json')
        assert r.status_code == 201, r.data
        assert r.data['building_name'] == building.name


@pytest.mark.django_db
class TestEligibilityAndBookings:

    def test_eligibility_endpoint(self, admin_client, campaign, resident, room, building):
        PlacementRule.objects.create(campaign=campaign, building=building, faculties=['Право'])
        r = admin_client.get(f'/api/v1/admission/eligibility/?resident={resident.id}&room={room.id}')
        assert r.status_code == 200
        assert r.data['ok'] is False and r.data['enforced'] and r.data['can_override']
        assert 'Право' in r.data['reasons'][0]

    def test_eligible_rooms_endpoint(self, admin_client, campaign, resident, room):
        r = admin_client.get(f'/api/v1/admission/eligible-rooms/?resident={resident.id}')
        assert r.status_code == 200
        assert [x['room_number'] for x in r.data] == ['101']

    def test_reserve_confirm_flow(self, manager_client, campaign, resident, room):
        r = manager_client.post('/api/v1/admission/bookings/', {'resident': str(resident.id), 'room': str(room.id)})
        assert r.status_code == 201, r.data
        booking_id = r.data['id']
        assert r.data['status'] == 'reserved'
        r = manager_client.post(f'/api/v1/admission/bookings/{booking_id}/confirm/')
        assert r.status_code == 200 and r.data['status'] == 'confirmed'
        room.refresh_from_db()
        assert room.current_occupancy == 1

    def test_reserve_blocked_by_window(self, manager_client, campaign, resident, room):
        BookingWindow.objects.create(campaign=campaign, opens_at=timezone.now() + datetime.timedelta(days=1), courses=[resident.course])
        r = manager_client.post('/api/v1/admission/bookings/', {'resident': str(resident.id), 'room': str(room.id)})
        assert r.status_code == 400
        assert 'закрыто' in r.data['error']['message']

    def test_assignment_api_override(self, admin_client, campaign, resident, room, contract, building):
        PlacementRule.objects.create(campaign=campaign, building=building, faculties=['Право'])
        r = admin_client.post('/api/v1/assignments/', {
            'contract': str(contract.id), 'resident': str(resident.id), 'room': str(room.id),
        })
        assert r.status_code == 400 and 'правилами' in r.data['error']['message']
        r = admin_client.post('/api/v1/assignments/', {
            'contract': str(contract.id), 'resident': str(resident.id), 'room': str(room.id),
            'override_reason': 'Решение ректората',
        })
        assert r.status_code == 201, r.data

    def test_status_endpoint(self, admin_client, campaign):
        BookingWindow.objects.create(campaign=campaign, opens_at=timezone.now() - datetime.timedelta(hours=1), courses=[1])
        r = admin_client.get('/api/v1/admission/status/')
        assert r.status_code == 200
        assert r.data['campaign']['id'] == str(campaign.id)
        assert len(r.data['open_windows']) == 1
