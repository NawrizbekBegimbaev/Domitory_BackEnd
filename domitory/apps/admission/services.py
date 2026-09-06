"""Eligibility engine + bookings.

Check order for "may resident R take room X now?":

1. active campaign of R's university (none → everything is allowed, legacy mode)
2. room is open (status available, not full, free beds after reservations)
3. gender policy of building and room
4. placement rules of building, floor and room (each level with rules must accept R)
5. booking window: at least one open window matches R (no windows at all → open)
6. fill order: buildings and floors that must fill first still have a bed R could take
"""
import datetime
import random
from dataclasses import dataclass, field

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.admission.models import AdmissionCampaign, Booking, BuildingOrder, PlacementRule
from apps.audit.services import AuditService
from apps.inventory.models import Room

OVERRIDE_ROLES = ('platform_admin', 'university_admin')


@dataclass
class Eligibility:
    ok: bool = True
    reasons: list = field(default_factory=list)
    codes: list = field(default_factory=list)

    def fail(self, code, reason):
        self.ok = False
        self.codes.append(code)
        self.reasons.append(reason)
        return self

    @property
    def message(self):
        return '; '.join(self.reasons)


class _Context:
    """Per-request cache so eligible_rooms() does not hit the DB per room."""

    def __init__(self, campaign):
        self.campaign = campaign
        self.rules = list(campaign.rules.select_related('building', 'floor', 'room__floor__building')) if campaign else []
        self.rules_by_building = {}
        self.rules_by_floor = {}
        self.rules_by_room = {}
        for r in self.rules:
            target = {'building': self.rules_by_building, 'floor': self.rules_by_floor, 'room': self.rules_by_room}[r.level]
            target.setdefault(getattr(r, f'{r.level}_id'), []).append(r)
        self.orders = {o.building_id: o for o in campaign.building_orders.all()} if campaign else {}
        self.windows = list(campaign.windows.all()) if campaign else []
        self._rooms = None
        self._reserved = None

    def rooms(self):
        """All rooms of the campaign's university with related floor/building."""
        if self._rooms is None:
            self._rooms = list(
                Room.objects.filter(floor__building__university_id=self.campaign.university_id)
                .select_related('floor', 'floor__building')
            )
        return self._rooms

    def reserved(self, room_id):
        if self._reserved is None:
            now = timezone.now()
            rows = (
                Booking.objects.filter(
                    campaign=self.campaign, status=Booking.Status.RESERVED, expires_at__gt=now,
                )
                .values('room_id').annotate(beds=Coalesce(Sum('beds'), 0))
            )
            self._reserved = {r['room_id']: r['beds'] for r in rows}
        return self._reserved.get(room_id, 0)


class EligibilityService:

    @staticmethod
    def active_campaign(university_id):
        if not university_id:
            return None
        return AdmissionCampaign.objects.filter(university_id=university_id, is_active=True).first()

    # --- single checks -------------------------------------------------

    @staticmethod
    def free_beds(room, ctx=None, exclude_resident=None):
        """Beds nobody occupies or holds. exclude_resident: ignore that resident's own hold."""
        if ctx is not None:
            reserved = ctx.reserved(room.id)
            if exclude_resident is not None:
                own = Booking.objects.filter(
                    room=room, resident=exclude_resident, status=Booking.Status.RESERVED,
                    expires_at__gt=timezone.now(),
                ).aggregate(b=Coalesce(Sum('beds'), 0))['b']
                reserved -= own
        else:
            qs = Booking.objects.filter(room=room, status=Booking.Status.RESERVED, expires_at__gt=timezone.now())
            if exclude_resident is not None:
                qs = qs.exclude(resident=exclude_resident)
            reserved = qs.aggregate(b=Coalesce(Sum('beds'), 0))['b']
        return room.capacity - room.current_occupancy - reserved

    @staticmethod
    def gender_ok(room, resident):
        b = room.floor.building
        if b.gender_policy == 'male_only' and resident.gender != 'male':
            return False, f'Корпус «{b.name}» только для мужчин'
        if b.gender_policy == 'female_only' and resident.gender != 'female':
            return False, f'Корпус «{b.name}» только для женщин'
        if room.gender_policy == 'male_only' and resident.gender != 'male':
            return False, f'Комната {room.room_number} только для мужчин'
        if room.gender_policy == 'female_only' and resident.gender != 'female':
            return False, f'Комната {room.room_number} только для женщин'
        return True, ''

    @staticmethod
    def placement_ok(ctx, room, resident):
        """Every level (building/floor/room) that has rules must have at least one matching rule."""
        for level, rules in (
            ('building', ctx.rules_by_building.get(room.floor.building_id, [])),
            ('floor', ctx.rules_by_floor.get(room.floor_id, [])),
            ('room', ctx.rules_by_room.get(room.id, [])),
        ):
            if rules and not any(r.matches(resident) for r in rules):
                allowed = ' / '.join(r.criteria_display() for r in rules)
                scope = {'building': f'Корпус «{room.floor.building.name}»',
                         'floor': f'Этаж {room.floor.number} корпуса «{room.floor.building.name}»',
                         'room': f'Комната {room.room_number}'}[level]
                return False, f'{scope} доступен только: {allowed}'
        return True, ''

    @staticmethod
    def window_state(ctx, resident, at):
        """(is_open, next_opening datetime or None). No windows configured → open."""
        if not ctx.windows:
            return True, None
        upcoming = None
        for w in ctx.windows:
            if not w.matches(resident):
                continue
            if w.is_open(at):
                return True, None
            if w.opens_at > at and (upcoming is None or w.opens_at < upcoming):
                upcoming = w.opens_at
        return False, upcoming

    @staticmethod
    def _room_takeable(ctx, room, resident):
        """Room has a bed this resident could take (ignoring windows and fill order)."""
        if room.status != Room.Status.AVAILABLE:
            return False
        if EligibilityService.free_beds(room, ctx, exclude_resident=resident) <= 0:
            return False
        if not EligibilityService.gender_ok(room, resident)[0]:
            return False
        return EligibilityService.placement_ok(ctx, room, resident)[0]

    @staticmethod
    def fill_order_ok(ctx, room, resident):
        campaign = ctx.campaign
        if not (campaign.buildings_sequential or campaign.floors_sequential):
            return True, ''
        order = ctx.orders.get(room.floor.building_id)
        if order is None:
            return True, ''  # building not in the queue → no sequencing for it
        rooms = ctx.rooms()

        if campaign.buildings_sequential:
            for other in ctx.orders.values():
                if other.priority >= order.priority:
                    continue
                blocking = next((r for r in rooms if r.floor.building_id == other.building_id
                                 and EligibilityService._room_takeable(ctx, r, resident)), None)
                if blocking:
                    return False, f'Сначала заполняется корпус «{blocking.floor.building.name}» (есть места: комната {blocking.room_number})'

        if campaign.floors_sequential:
            same_building = [r for r in rooms if r.floor.building_id == room.floor.building_id]
            floor_numbers = order.ordered_floor_numbers({r.floor.number for r in same_building})
            if room.floor.number in floor_numbers:
                for n in floor_numbers[:floor_numbers.index(room.floor.number)]:
                    blocking = next((r for r in same_building if r.floor.number == n
                                     and EligibilityService._room_takeable(ctx, r, resident)), None)
                    if blocking:
                        return False, f'Сначала заполняется этаж {n} (есть места: комната {blocking.room_number})'
        return True, ''

    # --- composite -----------------------------------------------------

    @staticmethod
    def check(resident, room, campaign=None, at=None, beds=1, skip_window=False, ctx=None):
        """Full eligibility answer for one resident/room pair."""
        at = at or timezone.now()
        if campaign is None:
            campaign = EligibilityService.active_campaign(resident.university_id)
        if campaign is None:
            return Eligibility()  # no campaign → legacy behaviour, nothing to enforce
        ctx = ctx or _Context(campaign)
        e = Eligibility()

        if room.floor.building.university_id != resident.university_id:
            return e.fail('other_university', 'Комната принадлежит другому университету')
        if room.status != Room.Status.AVAILABLE:
            e.fail('room_closed', f'Комната {room.room_number}: {room.get_status_display().lower()}')
        free = EligibilityService.free_beds(room, ctx, exclude_resident=resident)
        if free < beds:
            e.fail('no_beds', f'Нет свободных мест (свободно {max(free, 0)}, с учётом броней)')
        ok, why = EligibilityService.gender_ok(room, resident)
        if not ok:
            e.fail('gender', why)
        ok, why = EligibilityService.placement_ok(ctx, room, resident)
        if not ok:
            e.fail('placement', why)
        if not skip_window:
            is_open, upcoming = EligibilityService.window_state(ctx, resident, at)
            if not is_open:
                when = f' — откроется {timezone.localtime(upcoming):%d.%m.%Y %H:%M}' if upcoming else ''
                e.fail('window_closed', f'Бронирование для этого студента сейчас закрыто{when}')
        ok, why = EligibilityService.fill_order_ok(ctx, room, resident)
        if not ok:
            e.fail('fill_order', why)
        return e

    @staticmethod
    def eligible_rooms(resident, campaign=None, include_blocked=False, at=None):
        """Rooms of the resident's university with their eligibility."""
        campaign = campaign or EligibilityService.active_campaign(resident.university_id)
        if campaign is None:
            rooms = Room.objects.filter(
                floor__building__university_id=resident.university_id, status=Room.Status.AVAILABLE,
            ).select_related('floor', 'floor__building')
            return [{'room': r, 'ok': r.available_beds > 0, 'reasons': []} for r in rooms if include_blocked or r.available_beds > 0]
        ctx = _Context(campaign)
        result = []
        for room in ctx.rooms():
            e = EligibilityService.check(resident, room, campaign=campaign, at=at, ctx=ctx)
            if e.ok or include_blocked:
                result.append({'room': room, 'ok': e.ok, 'reasons': e.reasons, 'codes': e.codes})
        return result


class AdmissionGuard:
    """Used by RoomAssignmentService: block or allow-with-override."""

    @staticmethod
    def check_or_raise(resident, room, user=None, override_reason=None, beds=1, skip_window=False):
        campaign = EligibilityService.active_campaign(resident.university_id)
        if campaign is None or not campaign.enforce:
            return None
        e = EligibilityService.check(resident, room, campaign=campaign, beds=beds, skip_window=skip_window)
        if e.ok:
            return None
        if override_reason and user is not None and user.role_name in OVERRIDE_ROLES:
            AuditService.log(user, 'create', resident, {
                'action': 'admission_override',
                'room': room.room_number,
                'reason': override_reason,
                'blocked_by': e.reasons,
            })
            return e
        raise ValidationError('Заселение запрещено правилами: ' + e.message)


class CampaignService:

    @staticmethod
    @transaction.atomic
    def activate(campaign, user=None):
        AdmissionCampaign.objects.filter(university=campaign.university, is_active=True).exclude(pk=campaign.pk).update(is_active=False)
        campaign.is_active = True
        campaign.save(update_fields=['is_active'])
        if user:
            AuditService.log(user, 'update', campaign, {'is_active': {'old': False, 'new': True}})
        return campaign

    @staticmethod
    def status(university_id, at=None):
        """What the student app will show: active campaign, windows open now / next."""
        at = at or timezone.now()
        campaign = EligibilityService.active_campaign(university_id)
        if campaign is None:
            return {'campaign': None, 'open_windows': [], 'upcoming_windows': []}
        windows = list(campaign.windows.all())
        return {
            'campaign': campaign,
            'open_windows': [w for w in windows if w.is_open(at)],
            'upcoming_windows': [w for w in windows if w.opens_at > at],
        }


class BookingService:

    @staticmethod
    def expire_stale():
        return Booking.objects.filter(status=Booking.Status.RESERVED, expires_at__lte=timezone.now()).update(status=Booking.Status.EXPIRED)

    @staticmethod
    @transaction.atomic
    def reserve(resident, room, created_by=None, beds=1, override_reason='', note=''):
        from apps.occupancy.models import RoomAssignment
        BookingService.expire_stale()
        campaign = EligibilityService.active_campaign(resident.university_id)
        if campaign is None:
            raise ValidationError('Нет активной кампании заселения.')
        if RoomAssignment.objects.filter(resident=resident, status=RoomAssignment.Status.ACTIVE).exists():
            raise ValidationError('Жилец уже заселён.')
        if Booking.objects.filter(resident=resident, status=Booking.Status.RESERVED).exists():
            raise ValidationError('У жильца уже есть активная бронь.')
        e = EligibilityService.check(resident, room, campaign=campaign, beds=beds)
        if not e.ok:
            if not (override_reason and created_by is not None and created_by.role_name in OVERRIDE_ROLES):
                raise ValidationError('Бронирование запрещено правилами: ' + e.message)
        booking = Booking.objects.create(
            campaign=campaign, resident=resident, room=room, beds=beds,
            expires_at=timezone.now() + datetime.timedelta(hours=campaign.hold_hours),
            created_by=created_by, override_reason=override_reason or '', note=note,
        )
        if created_by:
            AuditService.log(created_by, 'create', booking, {
                'resident': str(resident), 'room': room.room_number,
                **({'override_reason': override_reason, 'blocked_by': e.reasons} if not e.ok else {}),
            })
        return booking

    @staticmethod
    @transaction.atomic
    def cancel(booking, user=None):
        if booking.status != Booking.Status.RESERVED:
            raise ValidationError('Отменить можно только активную бронь.')
        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=['status'])
        if user:
            AuditService.log(user, 'update', booking, {'status': {'old': 'reserved', 'new': 'cancelled'}})
        return booking

    @staticmethod
    @transaction.atomic
    def confirm(booking, user=None, contract=None):
        """Turn a reservation into a real assignment. Creates a contract for the
        campaign period if none is given (student app / online payment flow)."""
        from apps.occupancy.models import AccommodationContract
        from apps.occupancy.services import RoomAssignmentService

        BookingService.expire_stale()
        booking.refresh_from_db()
        if booking.status != Booking.Status.RESERVED:
            raise ValidationError('Бронь не активна (истекла или отменена).')

        campaign = booking.campaign
        if contract is None:
            contract = AccommodationContract.objects.create(
                resident=booking.resident,
                building=booking.room.floor.building,
                contract_number=BookingService._contract_number(),
                start_date=max(campaign.start_date, timezone.now().date()),
                end_date=campaign.end_date,
                status=AccommodationContract.Status.ACTIVE,
                created_by=user,
            )
        # Rules were checked at reservation time; the hold itself keeps the bed.
        assignment = RoomAssignmentService.assign_resident_to_room(
            booking.resident, booking.room, contract, user,
            beds_purchased=booking.beds, enforce_rules=False,
        )
        booking.status = Booking.Status.CONFIRMED
        booking.assignment = assignment
        booking.save(update_fields=['status', 'assignment'])
        if user:
            AuditService.log(user, 'update', booking, {'status': {'old': 'reserved', 'new': 'confirmed'}})
        return booking

    @staticmethod
    def _contract_number():
        from apps.occupancy.models import AccommodationContract
        year = timezone.now().year
        for _ in range(20):
            number = f'ДГ-{year}-{random.randint(0, 9999):04d}'
            if not AccommodationContract.objects.filter(contract_number=number).exists():
                return number
        return f'ДГ-{year}-{timezone.now():%H%M%S%f}'
