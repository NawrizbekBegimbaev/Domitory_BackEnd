from django.contrib import admin

from apps.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'model_name', 'object_id']
    list_filter = ['action', 'model_name']
    search_fields = ['model_name', 'object_id', 'user__full_name']
    readonly_fields = [
        'user', 'action', 'model_name', 'object_id',
        'changes', 'ip_address', 'timestamp',
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
