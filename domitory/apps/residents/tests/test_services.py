import pytest

from apps.audit.models import AuditLog
from apps.residents.models import Guardian, Resident, ResidentDocument
from apps.residents.services import ResidentService


@pytest.mark.django_db
class TestCreateResident:

    def test_creates_resident(self, db):
        resident = ResidentService.create_resident({
            'full_name': 'Test Student',
            'gender': 'male',
            'university_id': 'S100',
            'faculty': 'Engineering',
            'course': 1,
        })
        assert resident.pk is not None
        assert resident.full_name == 'Test Student'
        assert resident.status == Resident.Status.PENDING

    def test_creates_audit_log_when_user_provided(self, user):
        resident = ResidentService.create_resident(
            data={
                'full_name': 'Audited Student',
                'gender': 'female',
                'university_id': 'S200',
            },
            created_by=user,
        )
        assert AuditLog.objects.filter(
            action='create', model_name='Resident', object_id=str(resident.pk),
        ).exists()

    def test_no_audit_log_without_user(self, db):
        ResidentService.create_resident({
            'full_name': 'No Audit',
            'gender': 'male',
            'university_id': 'S300',
        })
        assert not AuditLog.objects.filter(model_name='Resident').exists()


@pytest.mark.django_db
class TestUpdateResident:

    def test_updates_fields(self, resident, user):
        ResidentService.update_resident(resident, {'full_name': 'Updated Name', 'faculty': 'Math'}, updated_by=user)
        resident.refresh_from_db()
        assert resident.full_name == 'Updated Name'
        assert resident.faculty == 'Math'

    def test_audit_log_on_update(self, resident, user):
        ResidentService.update_resident(resident, {'full_name': 'Changed'}, updated_by=user)
        log = AuditLog.objects.filter(action='update', model_name='Resident').first()
        assert log is not None
        assert 'full_name' in log.changes

    def test_no_audit_if_no_changes(self, resident, user):
        ResidentService.update_resident(resident, {'full_name': resident.full_name}, updated_by=user)
        assert not AuditLog.objects.filter(action='update', model_name='Resident').exists()


@pytest.mark.django_db
class TestUpdateStatus:

    def test_changes_status(self, resident):
        ResidentService.update_status(resident, Resident.Status.EVICTED)
        resident.refresh_from_db()
        assert resident.status == Resident.Status.EVICTED

    def test_audit_log_on_status_change(self, resident, user):
        ResidentService.update_status(resident, Resident.Status.SUSPENDED, updated_by=user)
        log = AuditLog.objects.filter(action='update', model_name='Resident').first()
        assert log is not None
        assert log.changes['status']['old'] == 'pending'
        assert log.changes['status']['new'] == 'suspended'


@pytest.mark.django_db
class TestAddGuardian:

    def test_adds_guardian(self, resident):
        guardian = ResidentService.add_guardian(resident, {
            'full_name': 'Parent Name',
            'relationship': 'father',
            'phone_number': '+998901234567',
            'is_emergency_contact': True,
        })
        assert guardian.pk is not None
        assert guardian.resident == resident
        assert Guardian.objects.filter(resident=resident).count() == 1

    def test_multiple_guardians(self, resident):
        ResidentService.add_guardian(resident, {'full_name': 'Father', 'relationship': 'father', 'phone_number': '+998901111111'})
        ResidentService.add_guardian(resident, {'full_name': 'Mother', 'relationship': 'mother', 'phone_number': '+998902222222'})
        assert Guardian.objects.filter(resident=resident).count() == 2


@pytest.mark.django_db
class TestAddDocument:

    def test_adds_document(self, resident):
        from django.core.files.uploadedfile import SimpleUploadedFile
        fake_file = SimpleUploadedFile('passport.pdf', b'fake-content', content_type='application/pdf')
        doc = ResidentService.add_document(resident, {
            'document_type': 'passport',
            'document_number': 'AB1234567',
            'file': fake_file,
        })
        assert doc.pk is not None
        assert doc.resident == resident
        assert ResidentDocument.objects.filter(resident=resident).count() == 1
