from django.contrib import admin
from .models import *

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'full_name',
        'birthday',
        'status',
        'arrival_date',
        'departure_date',
        'phone_number',
        'place_of_study',
        'floor',
        'room',
        'photo_of_passport',
        'photo_of_student',
        'created',
        'updated',
    )

@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = (
        'student',
        'full_name',
        'phone_number',
        'created',
        'updated',
    )

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'student',
        'date_of_payment',
        'payed_to_this_month',
        'created',
        'updated'
    )