from django.contrib import admin

from apps.residents.models import Guardian, Resident, ResidentDocument


class GuardianInline(admin.TabularInline):
    model = Guardian
    extra = 0


class DocumentInline(admin.TabularInline):
    model = ResidentDocument
    extra = 0


@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'university_id', 'gender', 'faculty',
        'course', 'status', 'phone_number',
    ]
    list_filter = ['status', 'gender', 'faculty', 'organization']
    search_fields = ['full_name', 'university_id', 'phone_number']
    inlines = [GuardianInline, DocumentInline]


@admin.register(Guardian)
class GuardianAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'resident', 'relationship', 'phone_number', 'is_emergency_contact']
    list_filter = ['relationship', 'is_emergency_contact']
    search_fields = ['full_name', 'phone_number']


@admin.register(ResidentDocument)
class ResidentDocumentAdmin(admin.ModelAdmin):
    list_display = ['resident', 'document_type', 'document_number', 'created_at']
    list_filter = ['document_type']
