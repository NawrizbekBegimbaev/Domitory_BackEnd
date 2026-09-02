#!/usr/bin/env bash
# Первичная настройка Oracle Cloud VM (Ubuntu 24.04, ARM Ampere A1 или x86).
# Запускать ОДИН РАЗ на новом сервере от root:
#   sudo bash setup_server.sh <DB_PASSWORD>
set -euo pipefail

DB_PASSWORD="${1:?Usage: sudo bash setup_server.sh <DB_PASSWORD>}"
APP_USER=dormitory
APP_HOME=/home/$APP_USER

echo "==> 1/7 Пакеты"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  python3 python3-venv python3-dev build-essential libpq-dev \
  postgresql postgresql-contrib nginx git rsync curl

echo "==> 2/7 Firewall: Oracle-образы Ubuntu блокируют 80/443 через iptables — открываем"
# Правила Oracle стоят ПЕРЕД REJECT, поэтому вставляем свои в начало цепочки
iptables -I INPUT 5 -p tcp --dport 80  -j ACCEPT
iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
netfilter-persistent save

echo "==> 3/7 Пользователь приложения"
id -u $APP_USER >/dev/null 2>&1 || useradd -m -s /bin/bash $APP_USER
mkdir -p $APP_HOME/backend $APP_HOME/frontend $APP_HOME/backups
chown -R $APP_USER:$APP_USER $APP_HOME
chmod 755 $APP_HOME   # nginx должен читать frontend/ и media/

echo "==> 4/7 PostgreSQL"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$APP_USER') THEN
    CREATE ROLE $APP_USER LOGIN PASSWORD '$DB_PASSWORD';
  END IF;
END \$\$;
SELECT 'CREATE DATABASE $APP_USER OWNER $APP_USER'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$APP_USER')\gexec
SQL

echo "==> 5/7 Python venv"
sudo -u $APP_USER python3 -m venv $APP_HOME/venv
sudo -u $APP_USER $APP_HOME/venv/bin/pip install --upgrade pip wheel

echo "==> 6/7 Nginx + systemd"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p /etc/nginx/ssl
[ -f /etc/nginx/ssl/dormitory.key ] || openssl req -x509 -nodes -days 3650 -newkey rsa:2048   -keyout /etc/nginx/ssl/dormitory.key -out /etc/nginx/ssl/dormitory.crt   -subj "/CN=begimbaev-dormitory.uk"
cp "$SCRIPT_DIR/nginx/dormitory.conf" /etc/nginx/sites-available/dormitory
ln -sf /etc/nginx/sites-available/dormitory /etc/nginx/sites-enabled/dormitory
rm -f /etc/nginx/sites-enabled/default
cp "$SCRIPT_DIR/systemd/dormitory.service"     /etc/systemd/system/
cp "$SCRIPT_DIR/systemd/dormitory-bot.service" /etc/systemd/system/
cp "$SCRIPT_DIR/manage.sh" $APP_HOME/manage.sh && chmod 755 $APP_HOME/manage.sh
systemctl daemon-reload
systemctl enable nginx dormitory dormitory-bot
nginx -t && systemctl restart nginx

echo "==> 7/7 Cron: авто-выселение по истёкшим договорам (каждый день в 01:00)"
CRON_LINE="0 1 * * * /home/dormitory/manage.sh auto_evict_expired >> /home/dormitory/auto_evict.log 2>&1"
( sudo -u $APP_USER crontab -l 2>/dev/null | grep -v auto_evict_expired || true; echo "$CRON_LINE" ) | sudo -u $APP_USER crontab -

echo
echo "Готово. Дальше:"
echo "  1. Создай /home/dormitory/backend/.env (см. env.production.example)"
echo "  2. С локальной машины запусти: bash deploy/oracle/deploy.sh <IP>"
echo "  3. Перенеси базу: bash deploy/oracle/migrate_db.sh <OLD_IP> <NEW_IP>"
