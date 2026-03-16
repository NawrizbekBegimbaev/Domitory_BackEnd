from django.contrib import admin

from apps.occupancy.models import AccommodationContract, RoomAssignment, StayRecord


class AssignmentInline(admin.TabularInline):
    model = RoomAssignment
    extra = 0
    readonly_fields = ['assigned_by', 'created_at']


@admin.register(AccommodationContract)
class ContractAdmin(admin.ModelAdmin):
    list_display = [
        'contract_number', 'resident', 'building',
        'start_date', 'end_date', 'status',
    ]
    list_filter = ['status', 'building']
    search_fields = ['contract_number', 'resident__full_name']
    inlines = [AssignmentInline]


@admin.register(RoomAssignment)
class RoomAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        'resident', 'room', 'start_date', 'end_date',
        'status', 'assigned_by',
    ]
    list_filter = ['status']
    search_fields = ['resident__full_name', 'room__room_number']


@admin.register(StayRecord)
class StayRecordAdmin(admin.ModelAdmin):
    list_display = [
        'resident', 'reason', 'check_in_at', 'check_out_at',
        'recorded_by', 'created_at',
    ]
    list_filter = ['reason']
    search_fields = ['resident__full_name']
