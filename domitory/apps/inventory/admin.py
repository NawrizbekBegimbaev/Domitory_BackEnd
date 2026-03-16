from django.contrib import admin

from apps.inventory.models import Building, Floor, Room


class FloorInline(admin.TabularInline):
    model = Floor
    extra = 1


class RoomInline(admin.TabularInline):
    model = Room
    extra = 0
    fields = ['room_number', 'capacity', 'current_occupancy', 'status', 'gender_policy', 'monthly_price']
    readonly_fields = ['current_occupancy']


@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'gender_policy', 'is_active', 'created_at']
    list_filter = ['is_active', 'gender_policy', 'organization']
    search_fields = ['name']
    inlines = [FloorInline]


@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'building', 'number']
    list_filter = ['building']
    inlines = [RoomInline]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = [
        'room_number', 'floor', 'capacity', 'current_occupancy',
        'status', 'gender_policy', 'monthly_price',
    ]
    list_filter = ['status', 'gender_policy', 'floor__building']
    search_fields = ['room_number']
    readonly_fields = ['current_occupancy']
