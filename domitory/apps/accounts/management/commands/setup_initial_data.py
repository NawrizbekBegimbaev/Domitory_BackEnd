from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.organizations.models import Organization


class Command(BaseCommand):
    help = 'Run all initial setup commands (roles, organization, superadmin)'

    def handle(self, *args, **options):
        call_command('create_initial_roles')
        call_command('create_initial_organization')
        call_command('create_superadmin')

        # Link superadmin to first organization
        org = Organization.objects.first()
        admin = User.objects.filter(role__name='platform_admin').first()
        if org and admin and admin.organization is None:
            admin.organization = org
            admin.save(update_fields=['organization'])
            self.stdout.write(self.style.SUCCESS(f'Linked {admin.email} to {org.name}'))

        self.stdout.write(self.style.SUCCESS('Initial data setup complete'))
