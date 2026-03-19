from django.db import transaction

from apps.audit.services import AuditService
from apps.residents.models import Guardian, Resident, ResidentDocument


class ResidentService:

    @staticmethod
    @transaction.atomic
    def create_resident(data, created_by=None):
        resident = Resident.objects.create(**data)
        if created_by:
            AuditService.log(created_by, 'create', resident, {
                'full_name': resident.full_name,
                'university_id': resident.university_id,
            })
        return resident

    @staticmethod
    def update_resident(resident, data, updated_by=None):
        old_data = {}
        for field in data:
            old_data[field] = str(getattr(resident, field, ''))

        for field, value in data.items():
            setattr(resident, field, value)
        resident.save(update_fields=list(data.keys()))

        if updated_by:
            changes = AuditService.get_changes_from_dicts(old_data, {k: str(v) for k, v in data.items()})
            if changes:
                AuditService.log(updated_by, 'update', resident, changes)
        return resident

    @staticmethod
    def update_status(resident, new_status, updated_by=None):
        old_status = resident.status
        resident.status = new_status
        resident.save(update_fields=['status'])
        if updated_by:
            AuditService.log(updated_by, 'update', resident, {
                'status': {'old': old_status, 'new': new_status},
            })
        return resident

    @staticmethod
    def add_guardian(resident, data):
        return Guardian.objects.create(resident=resident, **data)

    @staticmethod
    def add_document(resident, data):
        return ResidentDocument.objects.create(resident=resident, **data)
