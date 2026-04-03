"""
Auto-evict residents with expired contracts.

Run daily via cron:
    0 1 * * * cd /home/dormitory/backend && /home/dormitory/venv/bin/python manage.py auto_evict_expired

Logic:
    1. Find all ACTIVE contracts where end_date < today
    2. For each: terminate contract → close assignments → free rooms → evict resident
    3. Log everything to audit
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.occupancy.models import AccommodationContract
from apps.occupancy.services import ContractService
from apps.accounts.models import User

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Auto-evict residents whose contracts have expired (end_date < today)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = timezone.now().date()

        expired_contracts = AccommodationContract.objects.filter(
            status=AccommodationContract.Status.ACTIVE,
            end_date__lt=today,
        ).select_related('resident', 'building')

        count = expired_contracts.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS(f'[{today}] No expired contracts found.'))
            return

        self.stdout.write(f'[{today}] Found {count} expired contract(s):')

        # Use system user for audit logs
        system_user = User.objects.filter(role__name='platform_admin').first()

        terminated = 0
        errors = 0
        for contract in expired_contracts:
            resident_name = contract.resident.full_name
            contract_num = contract.contract_number
            end_date = contract.end_date

            if dry_run:
                self.stdout.write(f'  [DRY-RUN] Would terminate: {contract_num} ({resident_name}), expired {end_date}')
                continue

            try:
                ContractService.terminate_contract(contract, user=system_user)
                terminated += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  Terminated: {contract_num} ({resident_name}), expired {end_date}'
                ))
                logger.info(f'Auto-evicted: {resident_name} (contract {contract_num}, expired {end_date})')
            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(
                    f'  ERROR: {contract_num} ({resident_name}): {e}'
                ))
                logger.error(f'Auto-evict failed: {resident_name} (contract {contract_num}): {e}')

        if dry_run:
            self.stdout.write(f'\n[DRY-RUN] Would terminate {count} contract(s).')
        else:
            self.stdout.write(self.style.SUCCESS(
                f'\nDone: {terminated} terminated, {errors} errors.'
            ))
