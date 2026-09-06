import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='University',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True, verbose_name='Название')),
                ('short_name', models.CharField(blank=True, max_length=50, verbose_name='Краткое название')),
                ('city', models.CharField(blank=True, max_length=100, verbose_name='Город')),
                ('address', models.TextField(blank=True, verbose_name='Адрес')),
                ('contact_email', models.EmailField(blank=True, max_length=254, verbose_name='Email')),
                ('contact_phone', models.CharField(blank=True, max_length=17, verbose_name='Телефон')),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Университет',
                'verbose_name_plural': 'Университеты',
                'ordering': ['name'],
            },
        ),
    ]
