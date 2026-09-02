from django.contrib import admin

from apps.access_control.models import AccessEvent


@admin.register(AccessEvent)
class AccessEventAdmin(admin.ModelAdmin):
    list_display = ['resident', 'direction', 'timestamp', 'device_name']
    list_filter = ['direction', 'device_name']
    search_fields = ['resident__full_name', 'card_number']
    readonly_fields = ['id', 'created_at']
