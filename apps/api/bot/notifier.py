"""OTP'ni Telegram orqali admin'larga yuborish (SMS ulanmaguncha vaqtinchalik).

API (`app.integrations.sms`) shu funksiyani chaqiradi. Bot polling jarayoni
ishlamasa ham bu ishlaydi — shunchaki Telegram Bot API'ga xabar yuboradi.
"""

import structlog
from aiogram import Bot

from bot.config import bot_settings

log = structlog.get_logger()


async def send_otp_notification(phone: str, code: str) -> None:
    """OTP kodini sozlangan admin chat'larga yuboradi. Xato bo'lsa ham OTP oqimini buzmaydi."""
    if not bot_settings.enabled:
        return

    text = f"🔐 LunchDrop OTP\nTelefon: {phone}\nKod: {code}"
    bot = Bot(token=bot_settings.bot_token)
    try:
        for chat_id in bot_settings.chat_ids:
            try:
                await bot.send_message(chat_id, text)
            except Exception as exc:  # bitta chat xato bo'lsa, qolganlari yuborilsin
                log.error("telegram_otp_failed", chat_id=chat_id, error=str(exc))
    finally:
        await bot.session.close()
