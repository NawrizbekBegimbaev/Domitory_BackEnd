from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('universities', '0001_initial'),
        ('inventory', '0003_alter_building_options_alter_floor_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='building',
            name='university',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='buildings', to='universities.university', verbose_name='Университет'),
        ),
    ]
