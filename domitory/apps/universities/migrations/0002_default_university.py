"""Attach all pre-existing data to a single default university.

Before this release the platform was single-tenant. The default university is
created only if there is something to attach; rename it in the admin panel.
"""
from django.db import migrations

GLOBAL_ROLES = ('platform_admin', 'ministry')


def forwards(apps, schema_editor):
    University = apps.get_model('universities', 'University')
    Building = apps.get_model('inventory', 'Building')
    Resident = apps.get_model('residents', 'Resident')
    Faculty = apps.get_model('residents', 'Faculty')
    User = apps.get_model('accounts', 'User')

    scoped_users = User.objects.exclude(role__name__in=GLOBAL_ROLES).filter(university__isnull=True)
    needs_default = (
        Building.objects.filter(university__isnull=True).exists()
        or Resident.objects.filter(university__isnull=True).exists()
        or Faculty.objects.filter(university__isnull=True).exists()
        or scoped_users.exists()
    )
    if not needs_default:
        return

    uni, _ = University.objects.get_or_create(name='Университет', defaults={'short_name': 'Университет'})
    Building.objects.filter(university__isnull=True).update(university=uni)
    Resident.objects.filter(university__isnull=True).update(university=uni)
    Faculty.objects.filter(university__isnull=True).update(university=uni)
    scoped_users.update(university=uni)


class Migration(migrations.Migration):

    dependencies = [
        ('universities', '0001_initial'),
        ('accounts', '0008_university'),
        ('inventory', '0004_building_university'),
        ('residents', '0007_university_and_citizenship'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
