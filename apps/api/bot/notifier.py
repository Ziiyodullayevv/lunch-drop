"""OTP'ni Telegram orqali admin'larga yuborish (SMS ulanmaguncha vaqtinchalik).

API (`app.integrations.sms`) shu funksiyani chaqiradi. Bot polling jarayoni
ishlamasa ham bu ishlaydi — shunchaki Telegram Bot API'ga xabar yuboradi.
"""

import structlog
from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot.config import bot_settings

log = structlog.get_logger()


def approval_markup(kind: str, target_id: str) -> InlineKeyboardMarkup:
    if kind == "connection":
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="✅ Ulanishni tasdiqlash",
                        callback_data=f"connection:approve:{target_id}",
                    ),
                    InlineKeyboardButton(
                        text="❌ Rad etish",
                        callback_data=f"connection:reject:{target_id}",
                    ),
                ]
            ]
        )
    short_kind = "a" if kind == "admin" else "e"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Tasdiqlash",
                    callback_data=f"approve:{short_kind}:{target_id}",
                ),
                InlineKeyboardButton(
                    text="❌ Rad etish",
                    callback_data=f"reject:{short_kind}:{target_id}",
                ),
            ]
        ]
    )


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


async def send_approval_notification(target_id: str) -> None:
    """Yangi arizani tegishli Super/Company Admin chatlariga darhol yuboradi."""
    if not bot_settings.bot_token:
        return

    # Importni kechiktirish API startup paytidagi model import zanjirini sodda saqlaydi.
    from bot.approvals import card_for_target, recipient_chat_ids

    try:
        card = await card_for_target(target_id)
        if card is None:
            return
        chat_ids = await recipient_chat_ids(target_id)
    except Exception as exc:
        log.error(
            "telegram_approval_prepare_failed", target_id=target_id, error=str(exc)
        )
        return
    if card.kind == "admin" and not chat_ids:
        # Birinchi Super Admin hali /start qilmagan bo'lsa eski statik chatlar
        # bootstrap xabarini oladi. Bog'lanish paydo bo'lgach faqat roldagi
        # foydalanuvchilarga yuboriladi.
        chat_ids = bot_settings.chat_ids
    if not chat_ids:
        log.warning("telegram_approval_has_no_recipient", target_id=target_id)
        return

    bot = Bot(token=bot_settings.bot_token)
    try:
        for chat_id in chat_ids:
            try:
                await bot.send_message(
                    chat_id,
                    f"{card.title}\n\n{card.details}",
                    reply_markup=approval_markup(card.kind, target_id),
                )
            except Exception as exc:
                log.error(
                    "telegram_approval_failed",
                    target_id=target_id,
                    chat_id=chat_id,
                    error=str(exc),
                )
    finally:
        await bot.session.close()


async def send_kitchen_connection_notification(request_id: str) -> None:
    """Yangi kompaniya/filial ulanish so'rovini Kitchen Adminlarga yuboradi."""
    if not bot_settings.bot_token:
        return
    from bot.approvals import connection_card, connection_recipient_chat_ids

    try:
        card = await connection_card(request_id)
        chat_ids = await connection_recipient_chat_ids(request_id)
    except Exception as exc:
        log.error(
            "telegram_connection_prepare_failed", request_id=request_id, error=str(exc)
        )
        return
    if card is None or not chat_ids:
        log.warning("telegram_connection_has_no_recipient", request_id=request_id)
        return
    bot = Bot(token=bot_settings.bot_token)
    try:
        for chat_id in chat_ids:
            try:
                await bot.send_message(
                    chat_id,
                    f"{card.title}\n\n{card.details}",
                    reply_markup=approval_markup(card.kind, request_id),
                )
            except Exception as exc:
                log.error(
                    "telegram_connection_failed",
                    request_id=request_id,
                    chat_id=chat_id,
                    error=str(exc),
                )
    finally:
        await bot.session.close()
