from apps.residents.models import Resident


class ResidentService:

    @staticmethod
    def create_resident(data):
        return Resident.objects.create(**data)

    @staticmethod
    def update_status(resident, new_status):
        resident.status = new_status
        resident.save(update_fields=['status'])
        return resident
