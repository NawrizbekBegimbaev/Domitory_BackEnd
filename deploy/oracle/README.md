# Переезд на Oracle Cloud Always Free

Файлы в этой папке:

| Файл | Назначение |
|------|-----------|
| `setup_server.sh` | Однократная настройка нового сервера (пакеты, Postgres, firewall, nginx, systemd, cron) |
| `deploy.sh` | Обычный деплой backend + frontend с локальной машины (замена rsync-команд из CLAUDE.md) |
| `migrate_db.sh` | Перенос базы и media с Hetzner на Oracle |
| `nginx/dormitory.conf`, `systemd/*.service` | Конфиги, которые `setup_server.sh` копирует на сервер |
| `env.production.example` | Шаблон `.env` для сервера |

## Шаг 1. Аккаунт и VM в Oracle Cloud

1. Регистрация: https://cloud.oracle.com → Sign Up. Нужна банковская карта (списания не будет, только верификация 1 $). Home Region выбирать ближе к Узбекистану: **Frankfurt (eu-frankfurt-1)** или **Amsterdam**. Регион потом сменить нельзя.
2. Compute → Instances → **Create instance**:
   - Image: **Ubuntu 24.04** (Canonical Ubuntu, не Minimal).
   - Shape: **Ampere → VM.Standard.A1.Flex**, 2 OCPU, 12 GB RAM (можно до 4/24, но чем меньше, тем проще получить). Если пишет *Out of host capacity*, пробуйте другой Availability Domain, другое время суток, или временно 1 OCPU / 6 GB. Обычно удаётся за 1-3 дня попыток.
   - Запасной вариант, если ARM никак: **VM.Standard.E2.1.Micro** (x86, 1 GB RAM). Тогда в `systemd/dormitory.service` поставить `--workers 1`.
   - Networking: оставить создание VCN по умолчанию, **Assign a public IPv4 address = Yes**.
   - SSH keys: загрузить свой публичный ключ (`~/.ssh/id_ed25519.pub`).
3. Открыть порты в облачном firewall: Networking → Virtual Cloud Networks → ваша VCN → Security Lists → Default Security List → **Add Ingress Rules**:
   - Source CIDR `0.0.0.0/0`, Protocol TCP, Destination Port `80`
   - То же для порта `443`
   Порт 22 открыт по умолчанию.

Записать публичный IP инстанса — дальше он называется `<NEW_IP>`.

## Шаг 2. Настройка сервера

```bash
# с локальной машины (Git Bash), из корня репозитория
scp -r deploy/oracle ubuntu@<NEW_IP>:/tmp/oracle
ssh ubuntu@<NEW_IP> "sudo bash /tmp/oracle/setup_server.sh '<придумать_пароль_БД>'"
```

Скрипт сам открывает 80/443 в iptables внутри VM. Это отдельная ловушка Oracle: без этого порты закрыты, даже если в Security List всё разрешено.

## Шаг 3. `.env` на новом сервере

```bash
# забрать текущий .env с Hetzner
scp root@65.108.159.10:/home/dormitory/backend/.env deploy/oracle/backups/hetzner.env
```

Открыть файл, поменять две строки:
- `ALLOWED_HOSTS=...` добавить `<NEW_IP>`
- `DATABASE_URL=postgres://dormitory:<пароль_из_шага_2>@localhost:5432/dormitory`

Залить на сервер:

```bash
scp deploy/oracle/backups/hetzner.env ubuntu@<NEW_IP>:/tmp/.env
ssh ubuntu@<NEW_IP> "sudo mv /tmp/.env /home/dormitory/backend/.env && sudo chown dormitory:dormitory /home/dormitory/backend/.env && sudo chmod 600 /home/dormitory/backend/.env"
```

## Шаг 4. Деплой кода

```bash
bash deploy/oracle/deploy.sh <NEW_IP>
```

Проверка: `http://<NEW_IP>/api/v1/schema/` должен отдать OpenAPI, `http://<NEW_IP>/` — страницу логина.

## Шаг 5. Перенос базы и документов

Это единственный шаг с простоем. Он останавливает Django и бота на Hetzner, снимает дамп, восстанавливает на Oracle. Дамп и media остаются локально в `deploy/oracle/backups/` (папка в `.gitignore`).

```bash
bash deploy/oracle/migrate_db.sh 65.108.159.10 <NEW_IP>
```

После этого залогиниться на `http://<NEW_IP>/` своим обычным аккаунтом и убедиться, что жильцы, комнаты, платежи на месте.

## Шаг 6. Переключить домен

Cloudflare → DNS → записи `begimbaev-dormitory.uk` и `www`: поменять A-запись с `65.108.159.10` на `<NEW_IP>`. Proxy оставить включённым (оранжевое облако). SSL/TLS режим остаётся **Full**. Обновление занимает 1-5 минут.

Если режим стоит **Full (strict)**, nginx на порту 80 не подойдёт. Либо переключить на Full, либо выпустить Cloudflare Origin Certificate и добавить `listen 443 ssl` в `nginx/dormitory.conf`.

## Шаг 7. Проверка и отключение Hetzner

```bash
TEST_ENV=prod pytest qa/test_api.py -v
```

Бот: написать боту в Telegram `/start`, проверить логин по телефону в мобильном приложении. Мобильное приложение менять не нужно, оно ходит по домену.

Hetzner-сервер оставить выключенным ещё неделю на случай отката, потом удалить в панели Hetzner, чтобы прекратить списания.

## Дальнейшие деплои

Вместо rsync-команд из CLAUDE.md:

```bash
bash deploy/oracle/deploy.sh <NEW_IP>
```

## Полезное на сервере

```bash
# любая manage.py-команда (всегда production-настройки + PostgreSQL):
sudo /home/dormitory/manage.sh <command>
sudo systemctl status dormitory dormitory-bot nginx
sudo journalctl -u dormitory -f
sudo journalctl -u dormitory-bot -f
sudo -u postgres pg_dump -Fc dormitory > /home/dormitory/backups/$(date +%F).dump   # ручной бэкап
```

## Известные особенности Oracle Free

- **Idle reclaim**: Oracle может остановить бесплатную VM, если 7 дней подряд CPU < 20 %, сеть < 20 %, память < 20 %. Реальная работа админов и бот на long-polling обычно держат сеть выше порога. Если инстанс остановят, его просто запускают заново, данные не теряются. Как страховка можно перейти на Pay As You Go (карта привязана, но Always Free ресурсы остаются бесплатными) — тогда reclaim не применяется.
- **Boot volume** 50 GB входит в бесплатный лимит (всего 200 GB).
- Бэкапы базы лучше раз в неделю скачивать локально, см. команду выше.
