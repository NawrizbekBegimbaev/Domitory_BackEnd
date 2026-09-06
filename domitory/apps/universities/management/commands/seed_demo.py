"""Demo dataset: Ajou University in Tashkent.

    manage.py seed_demo [--admin-email nbegimbaev2006@gmail.com] [--password Ajou2026]

Creates (idempotently, keyed by names/emails): the university, staff accounts,
faculties, two buildings with floors and rooms, ~60 residents with realistic
Uzbek names, contracts and assignments through the real services (so charges,
payments, audit and stay records are produced the same way the UI produces them),
an active admission campaign with windows / restrictions / fill order, a few
bookings and access events. Safe to re-run: existing objects are reused.
"""
import datetime
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.access_control.models import AccessEvent
from apps.accounts.models import Role, User
from apps.admission.models import AdmissionCampaign, BookingWindow, BuildingOrder, PlacementRule
from apps.admission.services import BookingService, EligibilityService
from apps.billing.services import PaymentService
from apps.inventory.models import Building, Floor, Room
from apps.occupancy.models import AccommodationContract, RoomAssignment
from apps.occupancy.services import RoomAssignmentService
from apps.residents.models import Faculty, Guardian, Resident
from apps.universities.models import University

MALE_FIRST = ['Азизбек', 'Бобур', 'Жасур', 'Сардор', 'Улугбек', 'Шахзод', 'Фаррух', 'Отабек', 'Диёр', 'Жахонгир',
              'Санжар', 'Бекзод', 'Мухаммадали', 'Исломбек', 'Нодир', 'Темур', 'Абдулла', 'Камрон', 'Элёр', 'Рустам',
              'Достон', 'Шерзод', 'Азамат', 'Хусан', 'Фирдавс', 'Лазиз', 'Ойбек', 'Умид', 'Жавохир', 'Мирзо']
FEMALE_FIRST = ['Дилноза', 'Малика', 'Нилуфар', 'Севара', 'Гулнора', 'Мадина', 'Зарина', 'Камила', 'Шахноза', 'Феруза',
                'Нигора', 'Дурдона', 'Мохира', 'Лола', 'Азиза', 'Умида', 'Сабина', 'Муниса', 'Зилола', 'Диёра',
                'Юлдуз', 'Нафиса', 'Ирода', 'Шахло', 'Гузал', 'Робия', 'Наргиза', 'Мафтуна', 'Дилдора', 'Хилола']
LAST = ['Каримов', 'Рахимов', 'Абдуллаев', 'Юсупов', 'Турсунов', 'Мирзаев', 'Хасанов', 'Ахмедов', 'Исмоилов', 'Нурматов',
        'Саидов', 'Умаров', 'Холматов', 'Эргашев', 'Жураев', 'Ташкентов', 'Бекмуродов', 'Собиров', 'Назаров', 'Тохиров',
        'Кодиров', 'Расулов', 'Шарипов', 'Маматов', 'Ибрагимов', 'Хайдаров', 'Азимов', 'Файзуллаев', 'Рузиев', 'Худойбердиев']
PATRONYMIC_M = ['Бахтиёрович', 'Рустамович', 'Шухратович', 'Анварович', 'Фарходович', 'Улугбекович', 'Алишерович', 'Жамшидович']
PATRONYMIC_F = ['Бахтиёровна', 'Рустамовна', 'Шухратовна', 'Анваровна', 'Фарходовна', 'Улугбековна', 'Алишеровна', 'Жамшидовна']

FACULTIES = [
    'Архитектура',
    'Гражданское строительство',
    'Компьютерная инженерия',
    'Электроника и электротехника',
    'Машиностроение',
    'Промышленная инженерия',
]

FOREIGN = [('KZ', 'Ермек Сейтказы'), ('KZ', 'Айгерим Нурланова'), ('KR', 'Ким Мин Су'), ('KR', 'Пак Джи Ён'),
           ('TJ', 'Фаридун Назаров'), ('IN', 'Раджеш Кумар'), ('TM', 'Мерген Аннаев')]

PASSWORD_DEFAULT = 'Ajou2026'


class Command(BaseCommand):
    help = 'Seed the Ajou University in Tashkent demo dataset'

    def add_arguments(self, parser):
        parser.add_argument('--admin-email', default='nbegimbaev2006@gmail.com')
        parser.add_argument('--password', default=PASSWORD_DEFAULT)
        parser.add_argument('--ministry-password', default='Ministry2026')

    @transaction.atomic
    def handle(self, *args, **opts):
        random.seed(20260906)
        today = timezone.now().date()
        roles = {name: Role.objects.get_or_create(name=name)[0] for name in
                 ('university_admin', 'dorm_manager', 'accountant', 'security_staff', 'ministry')}

        # ---------- university ----------
        uni, _ = University.objects.get_or_create(
            name='Ajou University in Tashkent',
            defaults={'short_name': 'AUT', 'city': 'Ташкент', 'address': 'ул. Асалобод, 113, Яшнабадский район',
                      'contact_email': 'info@ajou.uz', 'contact_phone': '+998712008000'},
        )
        self.stdout.write(f'University: {uni}')

        # ---------- staff ----------
        def staff(email, full_name, role, position, passport, phone, university=uni, password=opts['password']):
            u, created = User.objects.get_or_create(email=email, defaults={
                'full_name': full_name, 'role': roles[role], 'university': university,
                'position': position, 'passport_number': passport, 'phone_number': phone,
            })
            if created:
                u.set_password(password)
                u.save()
            else:
                # make sure the account is attached to the demo university with the right role
                u.role = roles[role]
                u.university = university
                u.position = u.position or position
                u.passport_number = u.passport_number or passport
                u.set_password(password)
                u.save()
            return u

        admin = staff(opts['admin_email'], 'Бегимбаев Навризбек', 'university_admin',
                      'Начальник управления по работе со студентами', 'AB1234567', '+998901234567')
        manager = staff('j.karimov@ajou.uz', 'Каримов Жасур Бахтиёрович', 'dorm_manager',
                        'Комендант общежития', 'AA2345678', '+998901112233')
        accountant = staff('d.yusupova@ajou.uz', 'Юсупова Дилноза Рустамовна', 'accountant',
                           'Бухгалтер общежития', 'AA3456789', '+998901114455')
        staff('o.rahimov@ajou.uz', 'Рахимов Отабек Шухратович', 'security_staff',
              'Дежурный по общежитию', 'AA4567890', '+998901116677')
        staff('sh.abdullaev@edu.uz', 'Абдуллаев Шерзод Анварович', 'ministry',
              'Главный специалист Управления студенческих общежитий', 'AC1234567', '+998712391111',
              university=None, password=opts['ministry_password'])
        self.stdout.write('Staff: ok')

        # ---------- faculties ----------
        for name in FACULTIES:
            Faculty.objects.get_or_create(university=uni, name=name)

        # ---------- buildings ----------
        def building(name, gender, address, floors, rooms_per_floor, capacity, price):
            b, _ = Building.objects.get_or_create(university=uni, name=name, defaults={'gender_policy': gender, 'address': address})
            for n in range(1, floors + 1):
                f, _ = Floor.objects.get_or_create(building=b, number=n)
                for i in range(1, rooms_per_floor + 1):
                    Room.objects.get_or_create(floor=f, room_number=f'{n}{i:02d}', defaults={
                        'capacity': capacity if i % 3 else capacity - 1,
                        'gender_policy': gender, 'monthly_price': Decimal(price),
                    })
            return b

        b_a = building('Корпус A', 'male_only', 'ул. Асалобод, 113А', floors=4, rooms_per_floor=6, capacity=4, price='650000')
        b_b = building('Корпус B', 'female_only', 'ул. Асалобод, 113Б', floors=4, rooms_per_floor=6, capacity=3, price='700000')
        self.stdout.write('Buildings: ok')

        # ---------- admission campaign ----------
        campaign, created = AdmissionCampaign.objects.get_or_create(university=uni, academic_year='2026/2027', defaults={
            'name': 'Заселение 2026/2027', 'start_date': datetime.date(2026, 9, 1), 'end_date': datetime.date(2027, 6, 30),
            'is_active': True, 'enforce': True, 'floors_sequential': True, 'hold_hours': 48,
        })
        AdmissionCampaign.objects.filter(university=uni).exclude(pk=campaign.pk).update(is_active=False)
        tz = timezone.get_current_timezone()
        if created:
            def w(name, day, **crit):
                BookingWindow.objects.create(campaign=campaign, name=name,
                                             opens_at=timezone.make_aware(datetime.datetime(2026, 8 if day > 20 else 9, day, 9, 0), tz), **crit)
            w('Иностранные студенты', 25, foreign_policy='only_foreign')
            w('1 курс', 1, courses=[1])
            w('2 курс', 2, courses=[2])
            w('3 курс', 3, courses=[3])
            w('4 курс', 4, courses=[4])
            fa = {f.number: f for f in b_a.floors.all()}
            fb = {f.number: f for f in b_b.floors.all()}
            PlacementRule.objects.create(campaign=campaign, floor=fa[1], faculties=['Архитектура', 'Гражданское строительство'],
                                         note='Этаж рядом с проектной мастерской')
            PlacementRule.objects.create(campaign=campaign, floor=fa[2], faculties=['Компьютерная инженерия', 'Электроника и электротехника'])
            PlacementRule.objects.create(campaign=campaign, floor=fa[4], foreign_policy='only_foreign', note='Этаж для иностранных студентов')
            PlacementRule.objects.create(campaign=campaign, floor=fb[1], faculties=['Архитектура', 'Гражданское строительство'])
            PlacementRule.objects.create(campaign=campaign, floor=fb[4], foreign_policy='only_foreign')
            BuildingOrder.objects.create(campaign=campaign, building=b_a, priority=1, floor_direction='asc')
            BuildingOrder.objects.create(campaign=campaign, building=b_b, priority=2, floor_direction='asc')
        self.stdout.write('Campaign: ok')

        # ---------- residents ----------
        if Resident.objects.filter(university=uni).exists():
            self.stdout.write('Residents already exist — skipping residents/contracts/payments')
            return

        def make_resident(full_name, gender, faculty, course, citizenship='UZ', status='pending', phone=None, email=None):
            return Resident.objects.create(
                university=uni, full_name=full_name, gender=gender, faculty=faculty, course=course,
                citizenship=citizenship, status=status,
                student_number=f'AUT-{random.randint(2022, 2026)}-{random.randint(1000, 9999)}',
                phone_number=phone or f'+9989{random.randint(0, 9)}{random.randint(1000000, 9999999)}',
                email=email or '',
                birth_date=datetime.date(2026 - 17 - course, random.randint(1, 12), random.randint(1, 28)),
            )

        used = set()

        def name(gender):
            while True:
                first = random.choice(MALE_FIRST if gender == 'male' else FEMALE_FIRST)
                last = random.choice(LAST) + ('' if gender == 'male' else 'а')
                patr = random.choice(PATRONYMIC_M if gender == 'male' else PATRONYMIC_F)
                full = f'{last} {first} {patr}'
                if full not in used:
                    used.add(full)
                    return full

        # Rooms grouped by floor rule so that assignments respect the campaign rules.
        def rooms_of(building, floor_number):
            return list(Room.objects.filter(floor__building=building, floor__number=floor_number).order_by('room_number'))

        plan = []  # (resident, room)
        # Building A (male): floor 1 arch/civil, floor 2 CE/EE, floor 3 anyone (mech/industrial), floor 4 foreign
        groups_a = [
            (1, ['Архитектура', 'Гражданское строительство'], 14),
            (2, ['Компьютерная инженерия', 'Электроника и электротехника'], 12),
            (3, ['Машиностроение', 'Промышленная инженерия'], 8),
        ]
        groups_b = [
            (1, ['Архитектура', 'Гражданское строительство'], 9),
            (2, ['Компьютерная инженерия', 'Электроника и электротехника'], 8),
            (3, ['Машиностроение', 'Промышленная инженерия'], 5),
        ]
        for building, gender, groups in ((b_a, 'male', groups_a), (b_b, 'female', groups_b)):
            for floor_number, faculties, count in groups:
                rooms = rooms_of(building, floor_number)
                slots = [r for r in rooms for _ in range(r.capacity)]
                for i in range(count):
                    r = make_resident(name(gender), gender, random.choice(faculties), random.choice([1, 1, 2, 2, 3, 4]))
                    plan.append((r, slots[i]))
        # foreign students on floor 4
        for i, (code, full) in enumerate(FOREIGN):
            gender = 'female' if full.split()[0] in ('Айгерим', 'Пак') else 'male'
            b = b_a if gender == 'male' else b_b
            r = make_resident(full, gender, random.choice(FACULTIES), random.choice([1, 2, 3]), citizenship=code)
            slots = [x for x in rooms_of(b, 4) for _ in range(x.capacity)]
            plan.append((r, slots[i]))

        # Contracts + assignments through the real service (charges, stay records, audit)
        seq = 1
        for resident, room in plan:
            contract = AccommodationContract.objects.create(
                resident=resident, building=room.floor.building, contract_number=f'AUT-2026-{seq:04d}',
                start_date=datetime.date(2026, 9, 1), end_date=datetime.date(2027, 6, 30),
                status='active', created_by=manager,
            )
            seq += 1
            room.refresh_from_db()
            RoomAssignmentService.assign_resident_to_room(resident, room, contract, manager, enforce_rules=False)
        self.stdout.write(f'Residents assigned: {len(plan)}')

        # Guardians for a third of residents
        for resident, _ in plan[::3]:
            last = resident.full_name.split()[0].rstrip('а')
            Guardian.objects.create(
                resident=resident, full_name=f'{last} {random.choice(MALE_FIRST)} {random.choice(PATRONYMIC_M)}',
                relationship='father', phone_number=f'+99890{random.randint(1000000, 9999999)}', is_emergency_contact=True,
            )

        # Payments: most residents paid September (some 2–3 months ahead); ~15% are debtors
        pay_days = [datetime.date(2026, 9, d) for d in (1, 1, 2, 2, 3, 4, 5)]
        debtors = 0
        for idx, (resident, room) in enumerate(plan):
            if idx % 7 == 3:
                debtors += 1
                continue  # has not paid anything yet
            months = random.choice([1, 1, 1, 2, 3])
            amount = room.monthly_price * months
            if idx % 11 == 5:
                amount = (room.monthly_price / 2).quantize(Decimal('1'))  # partial payment
            PaymentService.record_payment(
                resident=resident, amount=amount, payment_date=random.choice(pay_days),
                payment_method=random.choice(['cash', 'bank_transfer', 'bank_transfer']),
                recorded_by=accountant, notes='Оплата за проживание',
            )
        self.stdout.write(f'Payments: ok (debtors: {debtors})')

        # Pending residents (registered, not yet assigned) + two active bookings
        pending = []
        for i in range(6):
            gender = 'male' if i % 2 == 0 else 'female'
            pending.append(make_resident(name(gender), gender, random.choice(FACULTIES), random.choice([1, 2])))
        for resident in pending[:2]:
            resident.faculty = 'Машиностроение'
            resident.save(update_fields=['faculty'])
            # first room the rules allow right now (windows, restrictions, fill order)
            allowed = EligibilityService.eligible_rooms(resident)
            if allowed:
                BookingService.reserve(resident, allowed[0]['room'], created_by=manager, note='Бронь через приёмную комиссию')

        # Two evicted, two graduated (history for reports)
        for resident, _ in plan[-2:]:
            a = RoomAssignment.objects.get(resident=resident, status='active')
            RoomAssignmentService.evict_resident(a, user=manager)
        for i in range(2):
            gender = 'male' if i == 0 else 'female'
            make_resident(name(gender), gender, random.choice(FACULTIES), 4, status='graduated')

        # Access events for today
        now = timezone.now()
        for resident, _ in plan[:15]:
            AccessEvent.objects.create(resident=resident, direction='out', timestamp=now - datetime.timedelta(hours=random.randint(3, 9)),
                                       device_name='Турникет, главный вход', card_number=f'AUT{random.randint(100000, 999999)}')
            AccessEvent.objects.create(resident=resident, direction='in', timestamp=now - datetime.timedelta(minutes=random.randint(5, 150)),
                                       device_name='Турникет, главный вход', card_number=f'AUT{random.randint(100000, 999999)}')

        self.stdout.write(self.style.SUCCESS(
            f'Done. Admin: {admin.email} / {opts["password"]}; staff password: {opts["password"]}; '
            f'ministry: sh.abdullaev@edu.uz / {opts["ministry_password"]}'
        ))
