from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('universities', '0002_default_university'),
        ('inventory', '0004_building_university'),
    ]

    operations = [
        migrations.AlterField(
            model_name='building',
            name='university',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='buildings', to='universities.university', verbose_name='Университет'),
        ),
    ]
