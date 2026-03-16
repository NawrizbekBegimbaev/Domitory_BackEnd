from django.core.management.base import BaseCommand

from apps.accounts.models import Role, User


class Command(BaseCommand):
    help = 'Create platform_admin superuser'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='admin@dormitory.uz')
        parser.add_argument('--password', default='admin123456')
        parser.add_argument('--name', default='Platform Admin')

    def handle(self, *args, **options):
        email = options['email']
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists'))
            return

        role = Role.objects.filter(name='platform_admin').first()
        if not role:
            self.stdout.write(self.style.ERROR('Run create_initial_roles first'))
            return

        user = User.objects.create_superuser(
            email=email,
            password=options['password'],
            full_name=options['name'],
            role=role,
        )
        self.stdout.write(self.style.SUCCESS(f'Superadmin created: {user.email}'))
