import pytest

from apps.audit.models import AuditLog
from apps.audit.services import AuditService


@pytest.mark.django_db
class TestAuditServiceLog:

    def test_creates_log_entry(self, user, building):
        log = AuditService.log(
            user=user, action='create', instance=building,
            changes={'name': 'test'}, ip_address='127.0.0.1',
        )
        assert log.pk is not None
        assert log.user == user
        assert log.action == 'create'
        assert log.model_name == 'Building'
        assert log.changes == {'name': 'test'}
        assert log.ip_address == '127.0.0.1'

    def test_log_without_changes(self, user, building):
        log = AuditService.log(user=user, action='delete', instance=building)
        assert log.changes == {}

    def test_log_without_ip(self, user, building):
        log = AuditService.log(user=user, action='update', instance=building)
        assert log.ip_address is None


class TestGetClientIp:

    def test_with_forwarded_header(self):
        class FakeRequest:
            META = {'HTTP_X_FORWARDED_FOR': '1.2.3.4, 5.6.7.8'}
        assert AuditService.get_client_ip(FakeRequest()) == '1.2.3.4'

    def test_with_remote_addr(self):
        class FakeRequest:
            META = {'REMOTE_ADDR': '10.0.0.1'}
        assert AuditService.get_client_ip(FakeRequest()) == '10.0.0.1'

    def test_forwarded_header_with_spaces(self):
        class FakeRequest:
            META = {'HTTP_X_FORWARDED_FOR': ' 1.2.3.4 , 5.6.7.8'}
        assert AuditService.get_client_ip(FakeRequest()) == '1.2.3.4'


class TestGetChanges:

    def test_detects_changes(self):
        class FakeInstance:
            name = 'Old Name'
            status = 'active'
        changes = AuditService.get_changes(FakeInstance(), {'name': 'New Name', 'status': 'active'})
        assert changes == {'name': {'old': 'Old Name', 'new': 'New Name'}}

    def test_no_changes(self):
        class FakeInstance:
            name = 'Same'
        assert AuditService.get_changes(FakeInstance(), {'name': 'Same'}) == {}

    def test_ignores_missing_fields(self):
        class FakeInstance:
            pass
        assert AuditService.get_changes(FakeInstance(), {'new_field': 'value'}) == {}
