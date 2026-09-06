from django.contrib import admin

from apps.admission.models import AdmissionCampaign, Booking, BookingWindow, BuildingOrder, PlacementRule


class WindowInline(admin.TabularInline):
    model = BookingWindow
    extra = 0


class RuleInline(admin.TabularInline):
    model = PlacementRule
    extra = 0


class OrderInline(admin.TabularInline):
    model = BuildingOrder
    extra = 0


@admin.register(AdmissionCampaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'university', 'academic_year', 'is_active', 'enforce', 'buildings_sequential', 'floors_sequential')
    list_filter = ('university', 'is_active')
    inlines = [WindowInline, RuleInline, OrderInline]


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('resident', 'room', 'status', 'expires_at', 'created_by')
    list_filter = ('status', 'campaign')
    search_fields = ('resident__full_name', 'room__room_number')
