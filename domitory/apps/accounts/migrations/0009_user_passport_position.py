from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_university'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='passport_number',
            field=models.CharField(blank=True, max_length=20, verbose_name='Паспорт'),
        ),
        migrations.AddField(
            model_name='user',
            name='position',
            field=models.CharField(blank=True, max_length=150, verbose_name='Должность'),
        ),
    ]
