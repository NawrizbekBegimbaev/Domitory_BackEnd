from django.db import models
from django.core.validators import RegexValidator #Для того чтобы добавить номер телефона 

class Student(models.Model):
    id = models.AutoField(primary_key=True)
    full_name = models.CharField('ФИО', max_length=100)
    birthday = models.DateField('Дата рождения')
    status = models.BooleanField('Проживает')
    arrival_date = models.DateField('Дата прибытья')
    departure_date = models.DateField('Дата отбытья')
    phone_number = models.CharField(
        max_length=15,
        validators=[RegexValidator(r'^\d{10,15}$', 'Введите корректный номер телефона из 10-15 цифр')]
    )
    place_of_study = models.CharField('Место учебы',max_length=200)
    floor = models.IntegerField('Этаж')
    room = models.IntegerField('Комната')
    photo_of_passport = models.ImageField('Фото паспорта',upload_to='passport_photos/',blank=True)
    photo_of_student = models.ImageField('Фото студента',upload_to='student_photos/',blank=True)
    created = models.DateTimeField('Дата создания', auto_now_add=True)
    updated = models.DateTimeField('Дата обновления',auto_now=True)

    def __str__(self):
        return self.full_name
    
class Parent(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='parent')
    full_name = models.CharField('ФИО Родителя', max_length=100)
    phone_number = models.CharField(
        max_length=15,
        validators=[RegexValidator(r'^\d{10,15}$', 'Введите корректный номер телефона из 10-15 цифр')]
    )
    created = models.DateTimeField('Создано',auto_now_add=True)
    updated = models.DateTimeField('Обновлено',auto_now=True)

    def __str__(self):
        return self.full_name
    
class Payment(models.Model):
    student = models.ForeignKey(Student,on_delete=models.CASCADE,related_name='payment')
    date_of_payment = models.DateField('Дата оплаты')
    payed_to_this_month = models.BooleanField('Оплачено на этот месяц')
    created = models.DateTimeField('Создано',auto_now_add=True)
    updated = models.DateTimeField('Обновлено', auto_now=True)
    

    def __str__(self):
        return f"Payment for {self.student} on {self.date_of_payment.strftime('%Y-%m-%d')}"