from rest_framework import serializers

from apps.audit.models import AuditLog


STATUS_TRANSLATIONS = {
    # Actions
    'create': 'Создание',
    'update': 'Изменение',
    'delete': 'Удаление',
    # Resident statuses
    'active': 'Активный',
    'pending': 'Ожидающий',
    'evicted': 'Выселен',
    'graduated': 'Выпустился',
    'suspended': 'Приостановлен',
    # Contract statuses
    'terminated': 'Расторгнут',
    'expired': 'Истёк',
    # Assignment statuses
    'completed': 'Завершено',
    'transferred': 'Переведён',
    # Room statuses
    'available': 'Свободна',
    'full': 'Занята',
    'maintenance': 'Ремонт',
    'closed': 'Закрыта',
    # Charge statuses
    'paid': 'Оплачен',
    'overdue': 'Просрочен',
    'partially_paid': 'Частично оплачен',
    'cancelled': 'Отменён',
    # Payment
    'cash': 'Наличные',
    'bank_transfer': 'Перевод',
    'card': 'Карта',
    # Gender
    'male': 'Мужской',
    'female': 'Женский',
    'male_only': 'Мужской',
    'female_only': 'Женский',
    'mixed': 'Смешанный',
    # Boolean
    'true': 'Да',
    'false': 'Нет',
    'True': 'Да',
    'False': 'Нет',
    # StayRecord reasons
    'initial_check_in': 'Заселение',
    'transfer': 'Перевод',
    'eviction': 'Выселение',
}


def translate_value(val):
    if isinstance(val, str):
        return STATUS_TRANSLATIONS.get(val, val)
    return val


def translate_changes(changes):
    if not isinstance(changes, dict):
        return changes
    result = {}
    for key, val in changes.items():
        if isinstance(val, dict):
            result[key] = {k: translate_value(v) for k, v in val.items()}
        else:
            result[key] = translate_value(val)
    return result


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default=None)
    user_email = serializers.CharField(source='user.email', read_only=True, default=None)
    action_display = serializers.SerializerMethodField()
    changes_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'user_email',
            'action', 'action_display', 'model_name', 'object_id',
            'changes', 'changes_display', 'ip_address', 'timestamp',
        ]

    def get_action_display(self, obj):
        return STATUS_TRANSLATIONS.get(obj.action, obj.action)

    def get_changes_display(self, obj):
        return translate_changes(obj.changes)
