#!/usr/bin/env bash
# Перенос PostgreSQL + media со старого сервера (Hetzner) на новый (Oracle).
#   bash deploy/oracle/migrate_db.sh <OLD_IP> <NEW_IP> [old_ssh_user=root] [new_ssh_user=ubuntu]
# Дамп сначала скачивается локально (deploy/oracle/backups/), потом заливается на новый сервер,
# так что локальная копия остаётся в любом случае.
set -euo pipefail

OLD="${1:?Usage: migrate_db.sh <OLD_IP> <NEW_IP>}"
NEW="${2:?Usage: migrate_db.sh <OLD_IP> <NEW_IP>}"
OLD_USER="${3:-root}"
NEW_USER="${4:-ubuntu}"
STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)/backups"
mkdir -p "$BACKUP_DIR"
DUMP="$BACKUP_DIR/dormitory_$STAMP.dump"

echo "==> 1/4 Останавливаю бэкенд на старом сервере, чтобы данные не менялись во время дампа"
ssh "$OLD_USER@$OLD" "systemctl stop dormitory dormitory-bot"

echo "==> 2/4 pg_dump на старом сервере -> $DUMP"
ssh "$OLD_USER@$OLD" "sudo -u postgres pg_dump -Fc dormitory" > "$DUMP"
ls -lh "$DUMP"

echo "==> 3/4 Восстановление на новом сервере"
scp "$DUMP" "$NEW_USER@$NEW:/tmp/dormitory.dump"
ssh "$NEW_USER@$NEW" 'sudo bash -s' <<'REMOTE_SCRIPT'
set -e
systemctl stop dormitory dormitory-bot || true
sudo -u postgres pg_restore --clean --if-exists --no-owner --role=dormitory -d dormitory /tmp/dormitory.dump
rm -f /tmp/dormitory.dump
systemctl start dormitory dormitory-bot
REMOTE_SCRIPT

echo "==> 4/4 Media (загруженные документы жильцов)"
MEDIA_DIR="$BACKUP_DIR/media_$STAMP"
mkdir -p "$MEDIA_DIR"
rsync -avz "$OLD_USER@$OLD:/home/dormitory/backend/media/" "$MEDIA_DIR/" || echo "media на старом сервере нет, пропускаю"
if [ -n "$(ls -A "$MEDIA_DIR" 2>/dev/null)" ]; then
  rsync -avz --rsync-path="sudo rsync" "$MEDIA_DIR/" "$NEW_USER@$NEW:/home/dormitory/backend/media/"
  ssh "$NEW_USER@$NEW" "sudo chown -R dormitory:dormitory /home/dormitory/backend/media"
fi

echo
echo "Готово. Старый сервер ОСТАНОВЛЕН, но не удалён. Проверь новый: http://$NEW/api/v1/"
echo "Локальная копия дампа: $DUMP"
