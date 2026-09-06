from django.contrib import admin

from apps.universities.models import University


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('name', 'short_name', 'city', 'is_active')
    search_fields = ('name', 'short_name', 'city')
