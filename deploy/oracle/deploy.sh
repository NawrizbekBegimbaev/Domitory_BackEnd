#!/usr/bin/env bash
# Деплой backend + frontend на сервер. Запускать из корня репозитория (Git Bash на Windows):
#   bash deploy/oracle/deploy.sh oracle          # через алиас из ~/.ssh/config
#   bash deploy/oracle/deploy.sh <IP> [ssh_user]  # или напрямую
# Файлы передаются tar-потоком по ssh (rsync на Windows нет).
set -euo pipefail

SERVER="${1:?Usage: bash deploy/oracle/deploy.sh <host|IP> [ssh_user]}"
SSH_USER="${2:-ubuntu}"
REMOTE="$SSH_USER@$SERVER"

cd "$(dirname "$0")/../.."

echo "==> Backend -> $REMOTE"
tar czf - \
  --exclude='.env' --exclude='__pycache__' --exclude='*.pyc' \
  --exclude='media' --exclude='staticfiles' --exclude='db.sqlite3' --exclude='.pytest_cache' \
  -C domitory . \
| ssh "$REMOTE" "sudo tar xzf - -C /home/dormitory/backend --no-same-owner"

echo "==> Frontend build"
( cd frontend && npm ci --legacy-peer-deps --silent && npm run build )

echo "==> Frontend -> $REMOTE"
tar czf - -C frontend/dist . \
| ssh "$REMOTE" "sudo rm -rf /home/dormitory/frontend.new && sudo mkdir -p /home/dormitory/frontend.new && sudo tar xzf - -C /home/dormitory/frontend.new --no-same-owner && sudo rm -rf /home/dormitory/frontend && sudo mv /home/dormitory/frontend.new /home/dormitory/frontend"

echo "==> Зависимости, миграции, статика, рестарт"
ssh "$REMOTE" 'sudo bash -s' <<'REMOTE_SCRIPT'
set -e
chown -R dormitory:dormitory /home/dormitory/backend /home/dormitory/frontend
sudo -u dormitory /home/dormitory/venv/bin/pip install -q -r /home/dormitory/backend/requirements/production.txt
/home/dormitory/manage.sh migrate --noinput
/home/dormitory/manage.sh collectstatic --noinput
systemctl restart dormitory dormitory-bot
systemctl reload nginx
systemctl is-active dormitory dormitory-bot nginx
REMOTE_SCRIPT

echo "==> Готово: http://$SERVER/"
