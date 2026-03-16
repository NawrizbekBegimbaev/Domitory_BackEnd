from django.core.management.base import BaseCommand

from apps.organizations.models import Organization


class Command(BaseCommand):
    help = 'Create the first organization'

    def add_arguments(self, parser):
        parser.add_argument('--name', default='University')
        parser.add_argument('--short-name', default='UNI')

    def handle(self, *args, **options):
        if Organization.objects.exists():
            self.stdout.write(self.style.WARNING('Organization already exists'))
            return

        org = Organization.objects.create(
            name=options['name'],
            short_name=options['short_name'],
            org_type='university',
        )
        self.stdout.write(self.style.SUCCESS(f'Organization created: {org.name}'))
