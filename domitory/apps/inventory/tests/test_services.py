import pytest
from django.core.exceptions import ValidationError

from apps.inventory.models import Room
from apps.inventory.services import RoomService


@pytest.mark.django_db
class TestValidateCapacity:

    def test_passes_when_room_has_space(self, room):
        RoomService.validate_capacity(room)  # should not raise

    def test_raises_when_room_is_full(self, room):
        room.current_occupancy = room.capacity
        room.save()
        with pytest.raises(ValidationError, match='is full'):
            RoomService.validate_capacity(room)

    def test_raises_when_occupancy_exceeds_capacity(self, room):
        room.current_occupancy = room.capacity + 1
        room.save()
        with pytest.raises(ValidationError, match='is full'):
            RoomService.validate_capacity(room)


@pytest.mark.django_db
class TestValidateGenderPolicy:

    def test_mixed_room_accepts_male(self, room, resident):
        RoomService.validate_gender_policy(room, resident)  # no raise

    def test_mixed_room_accepts_female(self, room, female_resident):
        RoomService.validate_gender_policy(room, female_resident)  # no raise

    def test_male_only_room_accepts_male(self, room_male_only, resident):
        RoomService.validate_gender_policy(room_male_only, resident)  # no raise

    def test_male_only_room_rejects_female(self, room_male_only, female_resident):
        with pytest.raises(ValidationError, match='для мужчин'):
            RoomService.validate_gender_policy(room_male_only, female_resident)

    def test_female_only_room_rejects_male(self, floor, resident):
        female_room = Room.objects.create(
            floor=floor,
            room_number='103',
            capacity=2,
            gender_policy='female_only',
        )
        with pytest.raises(ValidationError, match='для женщин'):
            RoomService.validate_gender_policy(female_room, resident)

    def test_female_only_room_accepts_female(self, floor, female_resident):
        female_room = Room.objects.create(
            floor=floor,
            room_number='104',
            capacity=2,
            gender_policy='female_only',
        )
        RoomService.validate_gender_policy(female_room, female_resident)  # no raise


@pytest.mark.django_db
class TestIncrementOccupancy:

    def test_increments_count(self, room):
        assert room.current_occupancy == 0
        RoomService.increment_occupancy(room)
        room.refresh_from_db()
        assert room.current_occupancy == 1
        assert room.status == Room.Status.AVAILABLE

    def test_sets_full_when_at_capacity(self, room):
        room.current_occupancy = room.capacity - 1
        room.save()
        RoomService.increment_occupancy(room)
        room.refresh_from_db()
        assert room.current_occupancy == room.capacity
        assert room.status == Room.Status.FULL


@pytest.mark.django_db
class TestDecrementOccupancy:

    def test_decrements_count(self, room):
        room.current_occupancy = 2
        room.save()
        RoomService.decrement_occupancy(room)
        room.refresh_from_db()
        assert room.current_occupancy == 1

    def test_does_not_go_below_zero(self, room):
        assert room.current_occupancy == 0
        RoomService.decrement_occupancy(room)
        room.refresh_from_db()
        assert room.current_occupancy == 0

    def test_changes_full_to_available(self, room):
        room.current_occupancy = room.capacity
        room.status = Room.Status.FULL
        room.save()
        RoomService.decrement_occupancy(room)
        room.refresh_from_db()
        assert room.status == Room.Status.AVAILABLE
