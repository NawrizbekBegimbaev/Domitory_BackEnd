from django.core.exceptions import ValidationError

from apps.inventory.models import Room


class RoomService:

    @staticmethod
    def validate_capacity(room):
        if room.current_occupancy >= room.capacity:
            raise ValidationError(f'Room {room.room_number} is full ({room.capacity}/{room.capacity}).')

    @staticmethod
    def validate_gender_policy(room, resident):
        if room.gender_policy == 'male_only' and resident.gender != 'male':
            raise ValidationError(f'Room {room.room_number} is male only.')
        if room.gender_policy == 'female_only' and resident.gender != 'female':
            raise ValidationError(f'Room {room.room_number} is female only.')

    @staticmethod
    def increment_occupancy(room):
        room.current_occupancy += 1
        if room.current_occupancy >= room.capacity:
            room.status = Room.Status.FULL
        room.save(update_fields=['current_occupancy', 'status'])

    @staticmethod
    def decrement_occupancy(room):
        if room.current_occupancy > 0:
            room.current_occupancy -= 1
        if room.current_occupancy < room.capacity and room.status == Room.Status.FULL:
            room.status = Room.Status.AVAILABLE
        room.save(update_fields=['current_occupancy', 'status'])
