"""
Telegram bot for Dormitory system.
Handles /start command to link Telegram account with phone number.
Runs as a long-polling process.

Usage: python manage.py run_telegram_bot
"""
import time
import requests
from django.core.management.base import BaseCommand
from django.conf import settings

from apps.accounts.models import User, TelegramLink


class Command(BaseCommand):
    help = 'Run Telegram bot for OTP and account linking'

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            self.stderr.write('TELEGRAM_BOT_TOKEN not set')
            return

        self.stdout.write(f'Telegram bot started (@{settings.TELEGRAM_BOT_USERNAME})')
        base_url = f'https://api.telegram.org/bot{token}'
        offset = 0

        while True:
            try:
                resp = requests.get(f'{base_url}/getUpdates', params={'offset': offset, 'timeout': 30}, timeout=35)
                data = resp.json()

                if not data.get('ok'):
                    time.sleep(5)
                    continue

                for update in data.get('result', []):
                    offset = update['update_id'] + 1
                    self._process_update(base_url, update)

            except requests.exceptions.Timeout:
                continue
            except Exception as e:
                self.stderr.write(f'Error: {e}')
                time.sleep(5)

    def _process_update(self, base_url, update):
        message = update.get('message')
        if not message:
            return

        chat_id = message['chat']['id']
        text = message.get('text', '').strip()
        contact = message.get('contact')

        if text == '/start':
            self._send(base_url, chat_id,
                '👋 <b>Dormitory System</b>\n\n'
                'Для привязки аккаунта отправьте свой контакт (номер телефона).\n\n'
                'Нажмите кнопку ниже 👇',
                reply_markup={
                    'keyboard': [[{'text': '📱 Отправить номер', 'request_contact': True}]],
                    'resize_keyboard': True,
                    'one_time_keyboard': True,
                }
            )
        elif contact:
            phone = contact.get('phone_number', '')
            if not phone.startswith('+'):
                phone = '+' + phone

            # Save to TelegramLink (for new user creation)
            TelegramLink.objects.update_or_create(
                phone_number=phone,
                defaults={'telegram_id': chat_id},
            )

            # Also update existing user if found
            try:
                user = User.objects.get(phone_number=phone)
                user.telegram_id = chat_id
                user.save(update_fields=['telegram_id'])
                self._send(base_url, chat_id,
                    f'✅ Аккаунт привязан!\n\n'
                    f'Имя: {user.full_name}\n'
                    f'Теперь вы можете получать OTP коды через Telegram.',
                    reply_markup={'remove_keyboard': True}
                )
                self.stdout.write(f'Linked user: {user.email} -> {chat_id}')
            except User.DoesNotExist:
                self._send(base_url, chat_id,
                    '✅ Номер телефона сохранён!\n\n'
                    'Когда администратор создаст ваш аккаунт, вы сможете получать OTP коды через Telegram.',
                    reply_markup={'remove_keyboard': True}
                )
                self.stdout.write(f'Linked phone: {phone} -> {chat_id}')
            except User.MultipleObjectsReturned:
                self._send(base_url, chat_id,
                    '⚠️ Обратитесь к администратору.',
                    reply_markup={'remove_keyboard': True}
                )
        else:
            self._send(base_url, chat_id,
                'Отправьте /start чтобы начать привязку аккаунта.'
            )

    def _send(self, base_url, chat_id, text, reply_markup=None):
        data = {'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}
        if reply_markup:
            import json
            data['reply_markup'] = json.dumps(reply_markup)
        try:
            requests.post(f'{base_url}/sendMessage', data=data, timeout=10)
        except Exception:
            pass
