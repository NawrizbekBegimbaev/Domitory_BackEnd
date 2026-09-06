import datetime
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.admission.models import AdmissionCampaign, Booking, BookingWindow, BuildingOrder, PlacementRule
from apps.admission.services import AdmissionGuard, BookingService, CampaignService, EligibilityService
from apps.audit.models import AuditLog
from apps.inventory.models import Building, Floor, Room
from apps.occupancy.models import AccommodationContract, RoomAssignment
from apps.occupancy.services import RoomAssignmentService
from apps.residents.models import Resident

SEP1 = timezone.make_aware(datetime.datetime(2026, 9, 1, 9, 0))
SEP2 = timezone.make_aware(datetime.datetime(2026, 9, 2, 9, 0))


def mk_room(floor, number, capacity=2, price='100000'):
    return Room.objects.create(floor=floor, room_number=number, capacity=capacity, monthly_price=Decimal(price))


def mk_resident(university, name, course=1, faculty='CS', citizenship='UZ', gender='male'):
    return Resident.objects.create(
        university=university, full_name=name, gender=gender, student_number=name.replace(' ', '-'),
        faculty=faculty, course=course, citizenship=citizenship,
    )


@pytest.fixture
def campaign(db, university):
    return AdmissionCampaign.objects.create(
        university=university, name='2026/2027', academic_year='2026/2027',
        start_date=datetime.date(2026, 9, 1), end_date=datetime.date(2027, 6, 30), is_active=True,
    )


@pytest.fixture
def campus(db, university):
    """Buildings A and B, 3 floors each, 1 room of 2 beds per floor."""
    layout = {}
    for name in ('A', 'B'):
        b = Building.objects.create(university=university, name=name, gender_policy='mixed')
        layout[name] = {'building': b, 'floors': {}, 'rooms': {}}
        for n in (1, 2, 3):
            f = Floor.objects.create(building=b, number=n)
            layout[name]['floors'][n] = f
            layout[name]['rooms'][n] = mk_room(f, f'{name}{n}01')
    return layout


@pytest.mark.django_db
class TestNoCampaign:

    def test_everything_allowed_without_campaign(self, resident, room):
        assert EligibilityService.check(resident, room).ok
        assert AdmissionGuard.check_or_raise(resident, room) is None


@pytest.mark.django_db
class TestWindows:

    def test_course_windows_open_in_order(self, campaign, campus, university):
        BookingWindow.objects.create(campaign=campaign, opens_at=SEP1, courses=[1])
        BookingWindow.objects.create(campaign=campaign, opens_at=SEP2, courses=[2])
        first = mk_resident(university, 'First Year', course=1)
        second = mk_resident(university, 'Second Year', course=2)
        room = campus['A']['rooms'][1]

        assert EligibilityService.check(first, room, at=SEP1).ok
        e = EligibilityService.check(second, room, at=SEP1)
        assert not e.ok and 'window_closed' in e.codes and '02.09.2026' in e.message
        assert EligibilityService.check(second, room, at=SEP2).ok

    def test_window_closes(self, campaign, campus, university):
        BookingWindow.objects.create(campaign=campaign, opens_at=SEP1, closes_at=SEP2, courses=[1])
        r = mk_resident(university, 'Late', course=1)
        assert EligibilityService.check(r, campus['A']['rooms'][1], at=SEP1).ok
        assert not EligibilityService.check(r, campus['A']['rooms'][1], at=SEP2 + datetime.timedelta(hours=1)).ok

    def test_foreign_window(self, campaign, campus, university):
        BookingWindow.objects.create(campaign=campaign, opens_at=SEP1, foreign_policy='only_foreign')
        BookingWindow.objects.create(campaign=campaign, opens_at=SEP2, courses=[1])
        foreign = mk_resident(university, 'Foreign One', course=1, citizenship='KZ')
        local = mk_resident(university, 'Local One', course=1)
        room = campus['A']['rooms'][1]
        assert EligibilityService.check(foreign, room, at=SEP1).ok
        assert not EligibilityService.check(local, room, at=SEP1).ok
        assert EligibilityService.check(local, room, at=SEP2).ok

    def test_no_windows_means_open(self, campaign, campus, university):
        r = mk_resident(university, 'Anyone', course=4)
        assert EligibilityService.check(r, campus['A']['rooms'][1], at=SEP1).ok


@pytest.mark.django_db
class TestPlacementRules:

    def test_floor_reserved_for_faculty(self, campaign, campus, university):
        PlacementRule.objects.create(campaign=campaign, floor=campus['A']['floors'][1], faculties=['Архитектура'])
        PlacementRule.objects.create(campaign=campaign, floor=campus['A']['floors'][2], faculties=['Компьютерная инженерия'])
        arch = mk_resident(university, 'Arch Student', faculty='Архитектура')
        ce = mk_resident(university, 'CE Student', faculty='Компьютерная инженерия')
        law = mk_resident(university, 'Law Student', faculty='Право')

        assert EligibilityService.check(arch, campus['A']['rooms'][1]).ok
        e = EligibilityService.check(ce, campus['A']['rooms'][1])
        assert not e.ok and 'placement' in e.codes and 'Архитектура' in e.message
        assert EligibilityService.check(ce, campus['A']['rooms'][2]).ok
        assert not EligibilityService.check(law, campus['A']['rooms'][2]).ok
        assert EligibilityService.check(law, campus['A']['rooms'][3]).ok  # floor 3 has no rules

    def test_levels_combine_with_and(self, campaign, campus, university):
        PlacementRule.objects.create(campaign=campaign, building=campus['A']['building'], courses=[1, 2])
        PlacementRule.objects.create(campaign=campaign, floor=campus['A']['floors'][1], foreign_policy='only_foreign')
        local_first = mk_resident(university, 'Local First', course=1)
        foreign_third = mk_resident(university, 'Foreign Third', course=3, citizenship='TR')
        foreign_first = mk_resident(university, 'Foreign First', course=1, citizenship='TR')
        room = campus['A']['rooms'][1]
        assert not EligibilityService.check(local_first, room).ok      # floor wants foreign
        assert not EligibilityService.check(foreign_third, room).ok    # building wants course 1-2
        assert EligibilityService.check(foreign_first, room).ok

    def test_same_scope_rules_are_or(self, campaign, campus, university):
        PlacementRule.objects.create(campaign=campaign, room=campus['A']['rooms'][1], faculties=['A'])
        PlacementRule.objects.create(campaign=campaign, room=campus['A']['rooms'][1], faculties=['B'])
        assert EligibilityService.check(mk_resident(university, 'Fac B', faculty='B'), campus['A']['rooms'][1]).ok
        assert not EligibilityService.check(mk_resident(university, 'Fac C', faculty='C'), campus['A']['rooms'][1]).ok


@pytest.mark.django_db
class TestFillOrder:

    def test_building_b_waits_for_a(self, campaign, campus, university):
        campaign.buildings_sequential = True
        campaign.save()
        BuildingOrder.objects.create(campaign=campaign, building=campus['A']['building'], priority=1)
        BuildingOrder.objects.create(campaign=campaign, building=campus['B']['building'], priority=2)
        r = mk_resident(university, 'Student')

        e = EligibilityService.check(r, campus['B']['rooms'][1])
        assert not e.ok and 'fill_order' in e.codes and 'корпус «A»' in e.message

        for room in campus['A']['rooms'].values():
            room.current_occupancy = room.capacity
            room.status = Room.Status.FULL
            room.save()
        assert EligibilityService.check(r, campus['B']['rooms'][1]).ok

    def test_building_b_opens_when_a_has_no_bed_for_this_student(self, campaign, campus, university):
        """A is reserved for Architecture; a CS student is not held back by A's free beds."""
        campaign.buildings_sequential = True
        campaign.save()
        BuildingOrder.objects.create(campaign=campaign, building=campus['A']['building'], priority=1)
        BuildingOrder.objects.create(campaign=campaign, building=campus['B']['building'], priority=2)
        PlacementRule.objects.create(campaign=campaign, building=campus['A']['building'], faculties=['Архитектура'])
        cs = mk_resident(university, 'CS Student', faculty='CS')
        arch = mk_resident(university, 'Arch Student', faculty='Архитектура')
        assert EligibilityService.check(cs, campus['B']['rooms'][1]).ok
        assert not EligibilityService.check(arch, campus['B']['rooms'][1]).ok

    def test_floors_fill_top_down(self, campaign, campus, university):
        campaign.floors_sequential = True
        campaign.save()
        BuildingOrder.objects.create(campaign=campaign, building=campus['A']['building'], priority=1, floor_direction='desc')
        r = mk_resident(university, 'Student')
        assert EligibilityService.check(r, campus['A']['rooms'][3]).ok
        e = EligibilityService.check(r, campus['A']['rooms'][2])
        assert not e.ok and 'этаж 3' in e.message
        room3 = campus['A']['rooms'][3]
        room3.current_occupancy = room3.capacity; room3.status = Room.Status.FULL; room3.save()
        assert EligibilityService.check(r, campus['A']['rooms'][2]).ok
        assert not EligibilityService.check(r, campus['A']['rooms'][1]).ok

    def test_custom_floor_order(self, campaign, campus, university):
        campaign.floors_sequential = True
        campaign.save()
        BuildingOrder.objects.create(campaign=campaign, building=campus['A']['building'], priority=1,
                                     floor_direction='custom', floor_order=[2, 3, 1])
        r = mk_resident(university, 'Student')
        assert EligibilityService.check(r, campus['A']['rooms'][2]).ok
        assert not EligibilityService.check(r, campus['A']['rooms'][3]).ok
        assert not EligibilityService.check(r, campus['A']['rooms'][1]).ok

    def test_unlisted_building_is_free(self, campaign, campus, university):
        campaign.buildings_sequential = True
        campaign.save()
        BuildingOrder.objects.create(campaign=campaign, building=campus['A']['building'], priority=1)
        r = mk_resident(university, 'Student')
        assert EligibilityService.check(r, campus['B']['rooms'][1]).ok


@pytest.mark.django_db
class TestReservationsAndGuard:

    def test_reservation_holds_bed(self, campaign, campus, university):
        room = campus['A']['rooms'][1]
        room.capacity = 1; room.save()
        holder = mk_resident(university, 'Holder')
        other = mk_resident(university, 'Other')
        booking = BookingService.reserve(holder, room)
        assert booking.status == Booking.Status.RESERVED
        e = EligibilityService.check(other, room)
        assert not e.ok and 'no_beds' in e.codes
        assert EligibilityService.check(holder, room).ok  # own hold does not block
        assert EligibilityService.free_beds(room) == 0

    def test_expired_reservation_frees_bed(self, campaign, campus, university):
        room = campus['A']['rooms'][1]
        room.capacity = 1; room.save()
        holder = mk_resident(university, 'Holder')
        booking = BookingService.reserve(holder, room)
        booking.expires_at = timezone.now() - datetime.timedelta(minutes=1)
        booking.save()
        assert BookingService.expire_stale() == 1
        assert EligibilityService.check(mk_resident(university, 'Other'), room).ok

    def test_reserve_respects_rules(self, campaign, campus, university):
        BookingWindow.objects.create(campaign=campaign, opens_at=timezone.now() + datetime.timedelta(days=1), courses=[1])
        r = mk_resident(university, 'Early Bird', course=1)
        with pytest.raises(ValidationError, match='запрещено правилами'):
            BookingService.reserve(r, campus['A']['rooms'][1])

    def test_confirm_creates_contract_and_assignment(self, campaign, campus, university, user):
        r = mk_resident(university, 'Booker')
        booking = BookingService.reserve(r, campus['A']['rooms'][1], created_by=user)
        booking = BookingService.confirm(booking, user=user)
        assert booking.status == Booking.Status.CONFIRMED
        assert booking.assignment.status == RoomAssignment.Status.ACTIVE
        contract = AccommodationContract.objects.get(resident=r)
        assert contract.end_date == campaign.end_date
        assert contract.contract_number.startswith('ДГ-')
        room = Room.objects.get(pk=campus['A']['rooms'][1].pk)
        assert room.current_occupancy == 1

    def test_cancel(self, campaign, campus, university, user):
        booking = BookingService.reserve(mk_resident(university, 'X'), campus['A']['rooms'][1], created_by=user)
        BookingService.cancel(booking, user=user)
        assert booking.status == Booking.Status.CANCELLED
        with pytest.raises(ValidationError):
            BookingService.confirm(booking, user=user)

    def test_guard_blocks_admin_assignment(self, campaign, campus, university, user):
        PlacementRule.objects.create(campaign=campaign, building=campus['A']['building'], faculties=['Архитектура'])
        r = mk_resident(university, 'CS Student', faculty='CS')
        contract = AccommodationContract.objects.create(
            resident=r, building=campus['A']['building'], contract_number='C-X',
            start_date=datetime.date.today(), end_date=datetime.date.today() + datetime.timedelta(days=300),
            status='active', created_by=user,
        )
        with pytest.raises(ValidationError, match='Заселение запрещено правилами'):
            RoomAssignmentService.assign_resident_to_room(r, campus['A']['rooms'][1], contract, user)

        # university_admin with a reason gets through and it is audited
        a = RoomAssignmentService.assign_resident_to_room(
            r, campus['A']['rooms'][1], contract, user, override_reason='Решение ректората',
        )
        assert a.status == RoomAssignment.Status.ACTIVE
        assert AuditLog.objects.filter(changes__action='admission_override').exists()

    def test_dorm_manager_cannot_override(self, campaign, campus, university, manager_user):
        PlacementRule.objects.create(campaign=campaign, building=campus['A']['building'], faculties=['Архитектура'])
        r = mk_resident(university, 'CS Student', faculty='CS')
        contract = AccommodationContract.objects.create(
            resident=r, building=campus['A']['building'], contract_number='C-Y',
            start_date=datetime.date.today(), end_date=datetime.date.today() + datetime.timedelta(days=300),
            status='active', created_by=manager_user,
        )
        with pytest.raises(ValidationError):
            RoomAssignmentService.assign_resident_to_room(
                r, campus['A']['rooms'][1], contract, manager_user, override_reason='please',
            )

    def test_enforce_off_lets_admin_through(self, campaign, campus, university, user):
        campaign.enforce = False
        campaign.save()
        PlacementRule.objects.create(campaign=campaign, building=campus['A']['building'], faculties=['Архитектура'])
        r = mk_resident(university, 'CS Student', faculty='CS')
        assert AdmissionGuard.check_or_raise(r, campus['A']['rooms'][1], user=user) is None


@pytest.mark.django_db
class TestEligibleRoomsAndCampaign:

    def test_eligible_rooms_filters(self, campaign, campus, university):
        PlacementRule.objects.create(campaign=campaign, building=campus['B']['building'], faculties=['Право'])
        r = mk_resident(university, 'CS Student', faculty='CS')
        rows = EligibilityService.eligible_rooms(r)
        numbers = {x['room'].room_number for x in rows}
        assert numbers == {'A101', 'A201', 'A301'}
        blocked = [x for x in EligibilityService.eligible_rooms(r, include_blocked=True) if not x['ok']]
        assert len(blocked) == 3

    def test_activate_deactivates_others(self, campaign, university, user):
        other = AdmissionCampaign.objects.create(
            university=university, name='Old', academic_year='2025/2026',
            start_date=datetime.date(2025, 9, 1), end_date=datetime.date(2026, 6, 30), is_active=False,
        )
        CampaignService.activate(other, user=user)
        campaign.refresh_from_db()
        assert other.is_active and not campaign.is_active
        assert EligibilityService.active_campaign(university.id) == other

    def test_status(self, campaign, university):
        BookingWindow.objects.create(campaign=campaign, opens_at=timezone.now() - datetime.timedelta(hours=1), courses=[1])
        BookingWindow.objects.create(campaign=campaign, opens_at=timezone.now() + datetime.timedelta(days=1), courses=[2])
        s = CampaignService.status(university.id)
        assert s['campaign'] == campaign
        assert len(s['open_windows']) == 1 and len(s['upcoming_windows']) == 1
