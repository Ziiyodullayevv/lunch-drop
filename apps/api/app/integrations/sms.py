"""SMS yuborish integratsiyasi.

Provayder sozlanmagan bo'lsa (SMS_API_URL/KEY bo'sh) — DEV rejimi: kod logga
yoziladi (real SMS yuborilmaydi), shunda dasturchi kodni ko'ra oladi.
Provayder sozlanganda kod logga YOZILMAYDI (security.md — maxfiy ma'lumot).
"""

import httpx
import structlog

from app.config import settings
from bot.notifier import send_otp_notification

log = structlog.get_logger()


async def send_otp_sms(phone: str, code: str) -> None:
    """OTP kodini yetkazadi.

    1) SMS provayder sozlangan bo'lsa — SMS yuboradi.
    2) Aks holda (vaqtinchalik) — Telegram bot orqali admin'larga yuboradi.
    3) Hech biri sozlanmagan bo'lsa — kod logga chiqadi (dev fallback).
    """
    text = f"LunchDrop tasdiqlash kodi: {code}"

    if settings.sms_api_url and settings.sms_api_key:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                settings.sms_api_url,
                headers={"Authorization": f"Bearer {settings.sms_api_key}"},
                json={"phone": phone, "text": text},
            )
            resp.raise_for_status()
        log.info("sms_sent", phone=phone)  # kod LOGGA yozilmaydi
        return

    # SMS yo'q — Telegram orqali yuborishga urinish (best-effort).
    await send_otp_notification(phone, code)
    # Dev fallback: kod logda ham qoladi (SMS/Telegram ishlamasa ko'rish uchun).
    log.warning("sms_dev_stub", phone=phone, code=code, note="SMS provayder sozlanmagan")
