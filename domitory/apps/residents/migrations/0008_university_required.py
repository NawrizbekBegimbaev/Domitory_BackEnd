from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('universities', '0002_default_university'),
        ('residents', '0007_university_and_citizenship'),
    ]

    operations = [
        migrations.AlterField(
            model_name='resident',
            name='university',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='residents', to='universities.university', verbose_name='Университет'),
        ),
        migrations.AlterField(
            model_name='faculty',
            name='university',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='faculties', to='universities.university', verbose_name='Университет'),
        ),
        migrations.AlterUniqueTogether(
            name='faculty',
            unique_together={('university', 'name')},
        ),
    ]
