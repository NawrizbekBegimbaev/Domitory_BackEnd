from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce

from apps.billing.models import Charge, Payment, PaymentAllocation
from apps.inventory.models import Building, Floor, Room
from apps.residents.models import Resident


class ReportService:

    @staticmethod
    def summary():
        from django.utils import timezone
        now = timezone.now()

        total_residents = Resident.objects.filter(status=Resident.Status.ACTIVE).count()

        room_stats = Room.objects.filter(
            status__in=[Room.Status.AVAILABLE, Room.Status.FULL],
        ).aggregate(
            total_capacity=Coalesce(Sum('capacity'), 0),
            total_occupancy=Coalesce(Sum('current_occupancy'), 0),
        )
        free_beds = room_stats['total_capacity'] - room_stats['total_occupancy']

        unpaid_statuses = [Charge.Status.PENDING, Charge.Status.OVERDUE, Charge.Status.PARTIALLY_PAID]

        total_debt = Charge.objects.filter(
            status__in=unpaid_statuses,
        ).aggregate(charged=Coalesce(Sum('amount'), Decimal('0')))['charged']

        allocated_to_unpaid = PaymentAllocation.objects.filter(
            charge__status__in=unpaid_statuses,
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        debt = total_debt - allocated_to_unpaid

        collected_this_month = Payment.objects.filter(
            status=Payment.Status.COMPLETED,
            payment_date__year=now.year,
            payment_date__month=now.month,
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        return {
            'total_residents': total_residents,
            'free_beds': free_beds,
            'total_debt': debt,
            'collected_this_month': collected_this_month,
        }

    @staticmethod
    def occupancy(building_id=None):
        buildings_qs = Building.objects.filter(is_active=True)
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
    def available_rooms(building_id=None, gender=None):
        qs = Room.objects.filter(
            status=Room.Status.AVAILABLE,
        ).select_related('floor', 'floor__building')

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
    def debtors():
        unpaid_statuses = [Charge.Status.PENDING, Charge.Status.OVERDUE, Charge.Status.PARTIALLY_PAID]

        residents_with_debt = Resident.objects.filter(
            status=Resident.Status.ACTIVE,
            charges__status__in=unpaid_statuses,
        ).distinct().annotate(
            total_charged=Coalesce(
                Sum('charges__amount', filter=Q(charges__status__in=unpaid_statuses)),
                Decimal('0'),
            ),
            total_allocated=Coalesce(
                Sum('charges__allocations__amount', filter=Q(charges__status__in=unpaid_statuses)),
                Decimal('0'),
            ),
        ).annotate(
            debt=F('total_charged') - F('total_allocated'),
        ).filter(debt__gt=0).order_by('-debt')

        return residents_with_debt.values(
            'id', 'full_name', 'university_id', 'faculty',
            'phone_number', 'total_charged', 'total_allocated', 'debt',
        )

    @staticmethod
    def payments_report(date_from=None, date_to=None, method=None):
        qs = Payment.objects.filter(
            status=Payment.Status.COMPLETED,
        ).select_related('resident', 'recorded_by')

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

        return {'payments': list(payments), 'total': total, 'count': qs.count()}

    @staticmethod
    def residents_report(status_filter=None, faculty=None, gender=None):
        qs = Resident.objects.all()

        if status_filter:
            qs = qs.filter(status=status_filter)
        if faculty:
            qs = qs.filter(faculty=faculty)
        if gender:
            qs = qs.filter(gender=gender)

        return qs.values(
            'id', 'full_name', 'university_id', 'gender',
            'faculty', 'course', 'phone_number', 'status',
        ).order_by('full_name')
