from django.contrib import admin

from apps.organizations.models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'short_name', 'org_type', 'status', 'created_at']
    list_filter = ['org_type', 'status']
    search_fields = ['name', 'short_name']
