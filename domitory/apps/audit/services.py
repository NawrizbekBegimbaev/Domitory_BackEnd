from apps.audit.models import AuditLog


class AuditService:

    @staticmethod
    def log(user, action, instance, changes=None, ip_address=None):
        return AuditLog.objects.create(
            user=user,
            action=action,
            model_name=instance.__class__.__name__,
            object_id=str(instance.pk),
            changes=changes or {},
            ip_address=ip_address,
        )

    @staticmethod
    def get_client_ip(request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @staticmethod
    def get_changes(old_instance, new_data):
        """Compare old instance fields with new data dict and return changes."""
        changes = {}
        for field, new_value in new_data.items():
            old_value = getattr(old_instance, field, None)
            if old_value is not None:
                old_str = str(old_value)
                new_str = str(new_value)
                if old_str != new_str:
                    changes[field] = {'old': old_str, 'new': new_str}
        return changes
