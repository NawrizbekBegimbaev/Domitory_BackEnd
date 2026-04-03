from django.core.management.base import BaseCommand
from django.db.models import Sum

from apps.inventory.models import Room
from apps.occupancy.models import RoomAssignment


class Command(BaseCommand):
    help = 'Recalculate current_occupancy for all rooms based on active assignments'

    def handle(self, *args, **options):
        rooms = Room.objects.all()
        fixed = 0
        for room in rooms:
            actual = RoomAssignment.objects.filter(
                room=room, status=RoomAssignment.Status.ACTIVE,
            ).aggregate(total=Sum('beds_purchased'))['total'] or 0

            if room.current_occupancy != actual:
                old = room.current_occupancy
                room.current_occupancy = actual
                if actual >= room.capacity:
                    room.status = Room.Status.FULL
                elif room.status == Room.Status.FULL:
                    room.status = Room.Status.AVAILABLE
                room.save(update_fields=['current_occupancy', 'status'])
                self.stdout.write(f'Room {room.room_number}: {old} -> {actual}')
                fixed += 1

        self.stdout.write(self.style.SUCCESS(f'Fixed {fixed} rooms'))
