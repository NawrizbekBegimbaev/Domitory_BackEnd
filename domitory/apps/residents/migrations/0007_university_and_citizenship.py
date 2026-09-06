from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('universities', '0001_initial'),
        ('residents', '0006_alter_residentdocument_file'),
    ]

    operations = [
        # Student card number used to be called university_id; the name is now taken by the tenant FK.
        migrations.RenameField(
            model_name='resident',
            old_name='university_id',
            new_name='student_number',
        ),
        migrations.AlterField(
            model_name='resident',
            name='student_number',
            field=models.CharField(max_length=50, verbose_name='Студ. билет'),
        ),
        migrations.AddField(
            model_name='resident',
            name='citizenship',
            field=models.CharField(default='UZ', max_length=2, verbose_name='Гражданство'),
        ),
        migrations.AddField(
            model_name='resident',
            name='university',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='residents', to='universities.university', verbose_name='Университет'),
        ),
        migrations.AlterField(
            model_name='faculty',
            name='name',
            field=models.CharField(max_length=150, verbose_name='Название'),
        ),
        migrations.AddField(
            model_name='faculty',
            name='university',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='faculties', to='universities.university', verbose_name='Университет'),
        ),
    ]
