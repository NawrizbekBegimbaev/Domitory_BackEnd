from django.core.management.base import BaseCommand

from apps.accounts.models import Role


class Command(BaseCommand):
    help = 'Create initial roles for the system'

    def handle(self, *args, **options):
        roles = [
            ('platform_admin', 'Full access to all organizations and settings'),
            ('university_admin', 'Full access within own organization'),
            ('dorm_manager', 'Manage residents, rooms, assignments'),
            ('accountant', 'Manage tariffs, charges, payments'),
            ('security_staff', 'Read-only access to residents and rooms'),
            ('ministry', 'Read-only access to statistics of all universities'),
        ]
        created = 0
        for name, description in roles:
            _, was_created = Role.objects.get_or_create(
                name=name,
                defaults={'description': description},
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Roles: {created} created, {len(roles) - created} already existed'))
