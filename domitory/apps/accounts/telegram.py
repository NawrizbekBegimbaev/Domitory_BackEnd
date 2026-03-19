import requests
from django.conf import settings


def send_telegram_message(chat_id: int, text: str) -> bool:
    """Send a message via Telegram Bot API."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return False
    url = f'https://api.telegram.org/bot{token}/sendMessage'
    try:
        resp = requests.post(url, json={'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}, timeout=10)
        return resp.status_code == 200
    except Exception:
        return False


def send_telegram_otp(chat_id: int, code: str) -> bool:
    """Send OTP code via Telegram."""
    text = f'🔐 <b>Dormitory</b>\n\nВаш код подтверждения: <code>{code}</code>\n\nКод действителен {settings.PASSWORD_RESET_OTP_EXPIRY} минут.'
    return send_telegram_message(chat_id, text)
