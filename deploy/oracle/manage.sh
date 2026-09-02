#!/usr/bin/env bash
# Обёртка для manage.py на сервере: всегда production-настройки (.env читает сам django-environ).
# Использование: sudo /home/dormitory/manage.sh migrate   (или из cron под пользователем dormitory)
set -euo pipefail
export DJANGO_SETTINGS_MODULE=config.settings.production
cd /home/dormitory/backend
if [ "$(id -un)" = "dormitory" ]; then
  exec /home/dormitory/venv/bin/python manage.py "$@"
else
  exec sudo -u dormitory env DJANGO_SETTINGS_MODULE=config.settings.production /home/dormitory/venv/bin/python manage.py "$@"
fi
