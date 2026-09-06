from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce

from apps.billing.models import Charge, Payment, PaymentAllocation
from apps.inventory.models import Building, Floor, Room
from apps.residents.models import Resident


def period_range(period, today=None):
    """Return (date_from, date_to) for period in ('month', 'quarter', 'year')."""
    today = today or date.today()
    if period == 'year':
        return date(today.year, 1, 1), date(today.year, 12, 31)
    if period == 'quarter':
        q_start_month = 3 * ((today.month - 1) // 3) + 1
        q_end_month = q_start_month + 2
        end_year, next_month = (today.year + 1, 1) if q_end_month == 12 else (today.year, q_end_month + 1)
        return date(today.year, q_start_month, 1), date(end_year, next_month, 1) - timedelta(days=1)
    # month
    if today.month == 12:
        last = date(today.year, 12, 31)
    else:
        last = date(today.year, today.month + 1, 1) - timedelta(days=1)
    return date(today.year, today.month, 1), last


def _due_charges_q(prefix=''):
    """Charges for the current month and earlier — what a resident actually owes today.
    Future months of the contract are billed but not yet due."""
    today = date.today()
    return (Q(**{f'{prefix}period_year__lt': today.year})
            | Q(**{f'{prefix}period_year': today.year, f'{prefix}period_month__lte': today.month}))


def _uni(qs, university_id, lookup='university'):
    """Narrow qs to one university (None = all)."""
    return qs.filter(**{f'{lookup}_id': university_id}) if university_id else qs


class ReportService:

    @staticmethod
    def _collected(date_from, date_to, university_id=None):
        return _uni(Payment.objects.filter(
            status=Payment.Status.COMPLETED,
            payment_date__gte=date_from,
            payment_date__lte=date_to,
        ), university_id, 'resident__university').aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

    @staticmethod
    def summary(university_id=None):
        from django.utils import timezone
        now = timezone.now()
        today = now.date()

        total_residents = _uni(Resident.objects.filter(status=Resident.Status.ACTIVE), university_id).count()

        room_stats = _uni(Room.objects.filter(
            status__in=[Room.Status.AVAILABLE, Room.Status.FULL],
        ), university_id, 'floor__building__university').aggregate(
            total_capacity=Coalesce(Sum('capacity'), 0),
            total_occupancy=Coalesce(Sum('current_occupancy'), 0),
        )
        free_beds = room_stats['total_capacity'] - room_stats['total_occupancy']

        unpaid_statuses = [Charge.Status.PENDING, Charge.Status.OVERDUE, Charge.Status.PARTIALLY_PAID]

        total_debt = _uni(Charge.objects.filter(
            _due_charges_q(), status__in=unpaid_statuses,
        ), university_id, 'resident__university').aggregate(charged=Coalesce(Sum('amount'), Decimal('0')))['charged']

        allocated_to_unpaid = _uni(PaymentAllocation.objects.filter(
            _due_charges_q('charge__'), charge__status__in=unpaid_statuses,
        ), university_id, 'charge__resident__university').aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        debt = total_debt - allocated_to_unpaid

        collected_this_month = ReportService._collected(*period_range('month', today), university_id=university_id)
        collected_this_quarter = ReportService._collected(*period_range('quarter', today), university_id=university_id)
        collected_this_year = ReportService._collected(*period_range('year', today), university_id=university_id)

        return {
            'total_residents': total_residents,
            'free_beds': free_beds,
            'total_capacity': room_stats['total_capacity'],
            'total_occupancy': room_stats['total_occupancy'],
            'total_debt': debt,
            'collected_this_month': collected_this_month,
            'collected_this_quarter': collected_this_quarter,
            'collected_this_year': collected_this_year,
        }

    @staticmethod
    def universities_overview():
        """Ministry view: summary per university plus totals."""
        from apps.universities.models import University
        rows = []
        for uni in University.objects.filter(is_active=True).order_by('name'):
            s = ReportService.summary(university_id=uni.id)
            cap = s['total_capacity']
            rows.append({
                'university_id': str(uni.id),
                'university_name': uni.name,
                'short_name': uni.short_name,
                'city': uni.city,
                'buildings': Building.objects.filter(university=uni, is_active=True).count(),
                'occupancy_percentage': round(s['total_occupancy'] / cap * 100, 1) if cap else 0,
                **s,
            })
        totals = {
            'universities': len(rows),
            'total_residents': sum(r['total_residents'] for r in rows),
            'free_beds': sum(r['free_beds'] for r in rows),
            'total_capacity': sum(r['total_capacity'] for r in rows),
            'total_occupancy': sum(r['total_occupancy'] for r in rows),
            'total_debt': sum((r['total_debt'] for r in rows), Decimal('0')),
            'collected_this_month': sum((r['collected_this_month'] for r in rows), Decimal('0')),
            'collected_this_quarter': sum((r['collected_this_quarter'] for r in rows), Decimal('0')),
            'collected_this_year': sum((r['collected_this_year'] for r in rows), Decimal('0')),
        }
        cap = totals['total_capacity']
        totals['occupancy_percentage'] = round(totals['total_occupancy'] / cap * 100, 1) if cap else 0
        return {'universities': rows, 'totals': totals}

    @staticmethod
    def occupancy(building_id=None, university_id=None):
        buildings_qs = _uni(Building.objects.filter(is_active=True), university_id)
        if building_id:
            buildings_qs = buildings_qs.filter(id=building_id)

        result = []
        for building in buildings_qs:
            floors_data = []
            floors = Floor.objects.filter(building=building).order_by('number')
            for floor in floors:
                stats = Room.objects.filter(floor=floor).aggregate(
                    total_capacity=Coalesce(Sum('capacity'), 0),
                    total_occupancy=Coalesce(Sum('current_occupancy'), 0),
                    room_count=Count('id'),
                )
                cap = stats['total_capacity']
                occ = stats['total_occupancy']
                floors_data.append({
                    'floor_number': floor.number,
                    'rooms': stats['room_count'],
                    'capacity': cap,
                    'occupancy': occ,
                    'free': cap - occ,
                    'percentage': round(occ / cap * 100, 1) if cap > 0 else 0,
                })

            building_cap = sum(f['capacity'] for f in floors_data)
            building_occ = sum(f['occupancy'] for f in floors_data)
            result.append({
                'building_id': str(building.id),
                'building_name': building.name,
                'capacity': building_cap,
                'occupancy': building_occ,
                'free': building_cap - building_occ,
                'percentage': round(building_occ / building_cap * 100, 1) if building_cap > 0 else 0,
                'floors': floors_data,
            })

        return result

    @staticmethod
    def available_rooms(building_id=None, gender=None, university_id=None):
        qs = _uni(Room.objects.filter(
            status=Room.Status.AVAILABLE,
        ), university_id, 'floor__building__university').select_related('floor', 'floor__building')

        if building_id:
            qs = qs.filter(floor__building_id=building_id)
        if gender:
            qs = qs.filter(
                Q(gender_policy=gender + '_only') | Q(gender_policy='mixed'),
            )

        return qs.annotate(
            free_beds=F('capacity') - F('current_occupancy'),
            building_name=F('floor__building__name'),
            floor_number=F('floor__number'),
        ).values(
            'id', 'room_number', 'building_name', 'floor_number',
            'capacity', 'current_occupancy', 'free_beds',
            'gender_policy', 'monthly_price',
        ).order_by('floor__building__name', 'floor__number', 'room_number')

    @staticmethod
    def debtors(university_id=None):
        unpaid_statuses = [Charge.Status.PENDING, Charge.Status.OVERDUE, Charge.Status.PARTIALLY_PAID]

        due = _due_charges_q('charges__') & Q(charges__status__in=unpaid_statuses)
        residents_with_debt = _uni(Resident.objects.filter(
            due, status=Resident.Status.ACTIVE,
        ), university_id).distinct().annotate(
            total_charged=Coalesce(
                Sum('charges__amount', filter=due),
                Decimal('0'),
            ),
            total_allocated=Coalesce(
                Sum('charges__allocations__amount', filter=due),
                Decimal('0'),
            ),
        ).annotate(
            debt=F('total_charged') - F('total_allocated'),
        ).filter(debt__gt=0).order_by('-debt')

        return residents_with_debt.values(
            'id', 'full_name', 'faculty',
            'phone_number', 'total_charged', 'total_allocated', 'debt',
            student_id=F('student_number'),
        )

    @staticmethod
    def payments_report(date_from=None, date_to=None, method=None, period=None, university_id=None):
        """period='month'|'quarter'|'year' overrides date_from/date_to with the current period."""
        if period in ('month', 'quarter', 'year'):
            date_from, date_to = period_range(period)

        qs = _uni(Payment.objects.filter(
            status=Payment.Status.COMPLETED,
        ), university_id, 'resident__university').select_related('resident', 'recorded_by')

        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)
        if method:
            qs = qs.filter(payment_method=method)

        payments = qs.values(
            'id', 'payment_date', 'amount', 'payment_method',
            resident_name=F('resident__full_name'),
            recorded_by_name=F('recorded_by__full_name'),
        ).order_by('-payment_date')

        total = qs.aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        by_method = list(
            qs.values('payment_method')
            .annotate(total=Coalesce(Sum('amount'), Decimal('0')), count=Count('id'))
            .order_by('payment_method')
        )

        return {
            'payments': list(payments), 'total': total, 'count': qs.count(),
            'date_from': date_from, 'date_to': date_to, 'period': period,
            'by_method': by_method,
        }

    @staticmethod
    def residents_report(status_filter=None, faculty=None, gender=None, university_id=None):
        qs = _uni(Resident.objects.all(), university_id)

        if status_filter:
            qs = qs.filter(status=status_filter)
        if faculty:
            qs = qs.filter(faculty=faculty)
        if gender:
            qs = qs.filter(gender=gender)

        return qs.values(
            'id', 'full_name', 'gender',
            'faculty', 'course', 'phone_number', 'status', 'citizenship',
            student_id=F('student_number'),
        ).order_by('full_name')
