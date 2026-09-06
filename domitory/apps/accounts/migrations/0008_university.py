from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('universities', '0001_initial'),
        ('accounts', '0007_alter_user_phone_number'),
    ]

    operations = [
        migrations.AlterField(
            model_name='role',
            name='name',
            field=models.CharField(choices=[('platform_admin', 'Суперадмин'), ('university_admin', 'Администратор'), ('dorm_manager', 'Комендант'), ('accountant', 'Бухгалтер'), ('security_staff', 'Охранник'), ('ministry', 'Министерство')], max_length=50, unique=True, verbose_name='Название'),
        ),
        migrations.AddField(
            model_name='user',
            name='university',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='users', to='universities.university', verbose_name='Университет'),
        ),
    ]
