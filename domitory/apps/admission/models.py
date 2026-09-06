"""Admission (booking) rules.

A university admin configures, per *campaign* (academic year):

* BookingWindow  — WHEN a group of students may book ("1 Sep 09:00 → course 1",
                   "2 Sep → course 2", "1 Sep → all foreign students").
* PlacementRule  — WHERE a group may live: a building / floor / room reserved
                   for given faculties, courses, foreign or local students.
* BuildingOrder  — the ORDER in which buildings (and floors inside them) fill
                   up: "B opens only when A has no free bed the student could take".
* Booking        — a reservation that holds a bed until it is paid/confirmed
                   or expires (student app, stage 2; admins can reserve now).

EligibilityService (services.py) combines all of this into one answer:
"may resident X take room Y right now, and if not — why".
"""
import uuid

from django.core.exceptions import ValidationError
from django.db import models

from common.mixins import TimestampMixin


class ForeignPolicy(models.TextChoices):
    ANY = 'any', 'Все студенты'
    ONLY_FOREIGN = 'only_foreign', 'Только иностранные'
    ONLY_LOCAL = 'only_local', 'Только местные'


class CriteriaMixin(models.Model):
    """Who a window / rule applies to. Empty list = no restriction on that axis."""
    courses = models.JSONField('Курсы', default=list, blank=True)
    faculties = models.JSONField('Факультеты', default=list, blank=True)
    foreign_policy = models.CharField(
        'Иностранцы', max_length=20, choices=ForeignPolicy.choices, default=ForeignPolicy.ANY,
    )

    class Meta:
        abstract = True

    def matches(self, resident):
        if self.courses and (resident.course is None or int(resident.course) not in [int(c) for c in self.courses]):
            return False
        if self.faculties and (resident.faculty or '').strip().lower() not in [str(f).strip().lower() for f in self.faculties]:
            return False
        if self.foreign_policy == ForeignPolicy.ONLY_FOREIGN and not resident.is_foreign:
            return False
        if self.foreign_policy == ForeignPolicy.ONLY_LOCAL and resident.is_foreign:
            return False
        return True

    def criteria_display(self):
        parts = []
        if self.courses:
            parts.append('курс ' + ', '.join(str(c) for c in self.courses))
        if self.faculties:
            parts.append(', '.join(self.faculties))
        if self.foreign_policy == ForeignPolicy.ONLY_FOREIGN:
            parts.append('только иностранные')
        elif self.foreign_policy == ForeignPolicy.ONLY_LOCAL:
            parts.append('только местные')
        return '; '.join(parts) or 'все студенты'


class AdmissionCampaign(TimestampMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university = models.ForeignKey(
        'universities.University', on_delete=models.CASCADE,
        related_name='campaigns', verbose_name='Университет',
    )
    name = models.CharField('Название', max_length=150)
    academic_year = models.CharField('Учебный год', max_length=9, help_text='2026/2027')
    start_date = models.DateField('Начало проживания')
    end_date = models.DateField('Окончание проживания')
    is_active = models.BooleanField('Активна', default=False)
    # Rules are checked when an admin assigns a room; students (stage 2) are always checked.
    enforce = models.BooleanField('Проверять правила при заселении админом', default=True)
    buildings_sequential = models.BooleanField(
        'Корпуса заполняются по очереди', default=False,
        help_text='Следующий корпус открывается, когда в предыдущих нет свободных мест для этого студента',
    )
    floors_sequential = models.BooleanField('Этажи заполняются по очереди', default=False)
    hold_hours = models.PositiveIntegerField('Срок брони, часов', default=24)

    class Meta:
        ordering = ['-start_date', 'name']
        unique_together = [('university', 'academic_year')]
        verbose_name = 'Кампания заселения'
        verbose_name_plural = 'Кампании заселения'

    def __str__(self):
        return f'{self.name} ({self.academic_year})'

    def clean(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValidationError({'end_date': 'Окончание должно быть позже начала.'})


class BookingWindow(TimestampMixin, CriteriaMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(AdmissionCampaign, on_delete=models.CASCADE, related_name='windows')
    name = models.CharField('Название', max_length=150, blank=True)
    opens_at = models.DateTimeField('Открывается')
    closes_at = models.DateTimeField('Закрывается', null=True, blank=True)

    class Meta:
        ordering = ['opens_at']
        verbose_name = 'Окно доступа'
        verbose_name_plural = 'Окна доступа'

    def __str__(self):
        return self.name or f'{self.opens_at:%d.%m.%Y %H:%M} — {self.criteria_display()}'

    def is_open(self, at):
        return self.opens_at <= at and (self.closes_at is None or at < self.closes_at)

    def clean(self):
        if self.closes_at and self.opens_at and self.closes_at <= self.opens_at:
            raise ValidationError({'closes_at': 'Закрытие должно быть позже открытия.'})


class PlacementRule(TimestampMixin, CriteriaMixin):
    """Exactly one of building / floor / room. Several rules on the same scope = OR;
    rules on nested scopes (building + floor) must all pass."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(AdmissionCampaign, on_delete=models.CASCADE, related_name='rules')
    building = models.ForeignKey('inventory.Building', on_delete=models.CASCADE, null=True, blank=True, related_name='placement_rules')
    floor = models.ForeignKey('inventory.Floor', on_delete=models.CASCADE, null=True, blank=True, related_name='placement_rules')
    room = models.ForeignKey('inventory.Room', on_delete=models.CASCADE, null=True, blank=True, related_name='placement_rules')
    note = models.CharField('Комментарий', max_length=255, blank=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Ограничение по местам'
        verbose_name_plural = 'Ограничения по местам'

    def clean(self):
        scopes = [s for s in (self.building_id, self.floor_id, self.room_id) if s]
        if len(scopes) != 1:
            raise ValidationError('Укажите ровно одно: корпус, этаж или комнату.')

    @property
    def level(self):
        if self.room_id:
            return 'room'
        if self.floor_id:
            return 'floor'
        return 'building'

    @property
    def scope_display(self):
        if self.room_id:
            return f'{self.room.floor.building.name}, этаж {self.room.floor.number}, комната {self.room.room_number}'
        if self.floor_id:
            return f'{self.floor.building.name}, этаж {self.floor.number}'
        return self.building.name if self.building_id else ''

    def __str__(self):
        return f'{self.scope_display}: {self.criteria_display()}'


class BuildingOrder(models.Model):
    class FloorDirection(models.TextChoices):
        ASC = 'asc', 'Снизу вверх (1 → N)'
        DESC = 'desc', 'Сверху вниз (N → 1)'
        CUSTOM = 'custom', 'Свой порядок'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(AdmissionCampaign, on_delete=models.CASCADE, related_name='building_orders')
    building = models.ForeignKey('inventory.Building', on_delete=models.CASCADE, related_name='fill_orders')
    priority = models.PositiveIntegerField('Очередь', default=1, help_text='1 заполняется первым')
    floor_direction = models.CharField('Порядок этажей', max_length=10, choices=FloorDirection.choices, default=FloorDirection.ASC)
    floor_order = models.JSONField('Свой порядок этажей', default=list, blank=True, help_text='Номера этажей по очереди')

    class Meta:
        ordering = ['priority']
        unique_together = [('campaign', 'building')]
        verbose_name = 'Очередь корпуса'
        verbose_name_plural = 'Очередь корпусов'

    def __str__(self):
        return f'{self.priority}. {self.building.name}'

    def ordered_floor_numbers(self, floor_numbers):
        """Floor numbers of the building in the order they should fill up."""
        numbers = sorted(set(floor_numbers))
        if self.floor_direction == self.FloorDirection.DESC:
            return list(reversed(numbers))
        if self.floor_direction == self.FloorDirection.CUSTOM and self.floor_order:
            custom = [int(n) for n in self.floor_order if int(n) in numbers]
            return custom + [n for n in numbers if n not in custom]
        return numbers


class Booking(TimestampMixin):
    class Status(models.TextChoices):
        RESERVED = 'reserved', 'Забронировано'
        CONFIRMED = 'confirmed', 'Подтверждено'
        EXPIRED = 'expired', 'Истекла'
        CANCELLED = 'cancelled', 'Отменена'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(AdmissionCampaign, on_delete=models.CASCADE, related_name='bookings')
    resident = models.ForeignKey('residents.Resident', on_delete=models.CASCADE, related_name='bookings')
    room = models.ForeignKey('inventory.Room', on_delete=models.CASCADE, related_name='bookings')
    beds = models.PositiveIntegerField('Мест', default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RESERVED)
    expires_at = models.DateTimeField('Действует до')
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_bookings')
    assignment = models.OneToOneField('occupancy.RoomAssignment', on_delete=models.SET_NULL, null=True, blank=True, related_name='booking')
    override_reason = models.TextField('Причина обхода правил', blank=True)
    note = models.CharField('Комментарий', max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Бронь'
        verbose_name_plural = 'Брони'

    def __str__(self):
        return f'{self.resident} → {self.room} ({self.get_status_display()})'
