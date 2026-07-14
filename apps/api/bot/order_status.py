"""Telegram order status outboxini formatlash va retry bilan yuborish."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from html import escape

import structlog
from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy import or_, select

from app.db.session import AsyncSessionLocal
from app.models.enums import ORDER_STATUS_LABELS, OrderStatus
from app.models.order import Order
from app.models.telegram import TelegramAccount, TelegramOrderStatusOutbox
from app.services.order_read import build_order_read
from bot.config import bot_settings

log = structlog.get_logger()


def _price(value) -> str:
    return f"{value:,.0f}".replace(",", " ")


def order_actions_markup(order_id: str, status: OrderStatus) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text="👁 Batafsil", callback_data=f"eo:view:{order_id}")]
    ]
    if status == OrderStatus.CREATED:
        rows.append(
            [
                InlineKeyboardButton(
                    text="❌ Bekor qilish", callback_data=f"eo:cancelorder:{order_id}"
                )
            ]
        )
    elif status == OrderStatus.ON_THE_WAY:
        rows.append(
            [
                InlineKeyboardButton(
                    text="✅ Yetib keldi",
                    callback_data=f"eo:confirmdelivery:{order_id}",
                )
            ]
        )
    return InlineKeyboardMarkup(inline_keyboard=rows)


def format_order_status_message(order, status: OrderStatus) -> str:
    items = order.items or []
    meals = ", ".join(
        f"{escape(item.meal_name or 'Taom')} ×{item.quantity}" for item in items
    ) or escape(order.meal_name or "Taom")
    return "\n".join(
        [
            f"<b>🧾 Buyurtma holati: {escape(ORDER_STATUS_LABELS[status], quote=False)}</b>",
            f"🍽 <b>Taomlar:</b> <i>{meals}</i>",
            f"🏢 <b>Filial:</b> {escape(order.branch_name or 'Filial')}",
            f"📅 <b>Sana:</b> {order.target_date.strftime('%d.%m.%Y')}",
            f"💰 <b>Jami:</b> {_price(order.historical_price)} so‘m",
        ]
    )


async def send_pending_order_statuses() -> dict[str, int]:
    """Navbatdagi xabarlarni jo'natadi; xatoda exponential retry qiladi."""
    now = datetime.now(UTC)
    async with AsyncSessionLocal() as session:
        rows = list(
            (
                await session.execute(
                    select(TelegramOrderStatusOutbox)
                    .where(
                        TelegramOrderStatusOutbox.sent_at.is_(None),
                        TelegramOrderStatusOutbox.attempts < 10,
                        or_(
                            TelegramOrderStatusOutbox.next_attempt_at.is_(None),
                            TelegramOrderStatusOutbox.next_attempt_at <= now,
                        ),
                    )
                    .order_by(TelegramOrderStatusOutbox.created_at)
                    .limit(100)
                )
            ).scalars()
        )

    if not bot_settings.bot_token:
        return {"pending": len(rows), "sent": 0, "failed": len(rows)}

    bot = Bot(bot_settings.bot_token)
    sent = failed = 0
    try:
        for queued in rows:
            async with AsyncSessionLocal() as session:
                outbox = await session.get(TelegramOrderStatusOutbox, queued.id)
                if outbox is None or outbox.sent_at is not None:
                    continue
                try:
                    order = await session.get(Order, outbox.order_id)
                    chat_id = (
                        await session.execute(
                            select(TelegramAccount.chat_id).where(
                                TelegramAccount.user_id == outbox.user_id,
                                TelegramAccount.is_active.is_(True),
                            )
                        )
                    ).scalar_one_or_none()
                    if order is None:
                        outbox.sent_at = now
                        outbox.last_error = "Order topilmadi"
                        await session.commit()
                        continue
                    if chat_id is None:
                        raise RuntimeError("Faol Telegram hisobi topilmadi")
                    read = await build_order_read(session, order)
                    queued_status = OrderStatus(outbox.status)
                    await bot.send_message(
                        chat_id,
                        format_order_status_message(read, queued_status),
                        parse_mode="HTML",
                        reply_markup=order_actions_markup(order.id, order.status),
                    )
                    outbox.sent_at = datetime.now(UTC)
                    outbox.last_error = None
                    sent += 1
                except Exception as exc:
                    outbox.attempts += 1
                    delay = min(60, 2 ** min(outbox.attempts, 5))
                    outbox.next_attempt_at = datetime.now(UTC) + timedelta(
                        minutes=delay
                    )
                    outbox.last_error = str(exc)[:2000]
                    failed += 1
                    log.warning(
                        "telegram_order_status_failed",
                        outbox_id=outbox.id,
                        attempts=outbox.attempts,
                        error=str(exc),
                    )
                await session.commit()
    finally:
        await bot.session.close()
    result = {"pending": len(rows), "sent": sent, "failed": failed}
    log.info("telegram_order_status_outbox", **result)
    return result
