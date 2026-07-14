"""Yetkazish vaqti kelganda filial buyurtmalarini yo'lga chiqarish tasdig'i."""

from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from zoneinfo import ZoneInfo

import structlog
from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy import select, update

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.enums import AccountStatus, OrderStatus, UserRole
from app.models.kitchen import Kitchen
from app.models.order import Order
from app.models.telegram import TelegramAccount, TelegramDeliveryPrompt
from app.models.user import User
from app.services.order_status import record_order_status
from bot.approvals import TelegramApprovalError, get_linked_user
from bot.config import bot_settings
from bot.orders import KitchenOrderSummary, build_kitchen_order_summaries

log = structlog.get_logger()


def delivery_prompt_markup(
    prompt_id: str, action: str = "dispatch"
) -> InlineKeyboardMarkup:
    button_text = (
        "🚚 Ha, yo'lga chiqarish"
        if action == "dispatch"
        else "✅ Ha, yetkazildi"
    )
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=button_text,
                    callback_data=f"delivery:confirm:{prompt_id}",
                )
            ]
        ]
    )


def format_delivery_prompt(
    summary: KitchenOrderSummary, action: str = "dispatch"
) -> str:
    title = (
        "🚚 Yetkazish vaqti keldi"
        if action == "dispatch"
        else "✅ Yetkazish vaqti tugadi"
    )
    question = (
        "Ushbu filial buyurtmalarini yo'lga chiqaramizmi?"
        if action == "dispatch"
        else "Ushbu filial buyurtmalari yetkazildimi?"
    )
    return "\n".join(
        [
            f"<b>{title}</b>",
            f"🏬 <b>Kompaniya:</b> {escape(summary.company_name)}",
            f"🏢 <b>Filial:</b> {escape(summary.branch_name)}",
            f"🧾 <b>Buyurtmalar:</b> {summary.order_count} ta",
            f"🍽 <b>Porsiyalar:</b> {summary.portion_count} ta",
            "",
            f"<i>{question}</i>",
        ]
    )


async def send_due_delivery_prompts(
    now: datetime | None = None,
) -> dict[str, int]:
    """Yetkazish vaqti o'tgan filiallar uchun kitchen admin tasdig'ini yuboradi."""
    local_now = now or datetime.now(ZoneInfo(settings.timezone))
    today, current_time = local_now.date(), local_now.time()
    if not bot_settings.bot_token:
        return {"kitchens": 0, "pending": 0, "sent": 0, "failed": 0}

    async with AsyncSessionLocal() as session:
        kitchens = (
            await session.execute(
                select(Kitchen).where(
                    Kitchen.is_active.is_(True),
                    Kitchen.deleted_at.is_(None),
                    Kitchen.delivery_start_time <= current_time,
                )
            )
        ).scalars().all()

    pending: list[tuple[Kitchen, str, int, KitchenOrderSummary, str]] = []
    for kitchen in kitchens:
        async with AsyncSessionLocal() as session:
            recipients = (
                await session.execute(
                    select(User.id, TelegramAccount.chat_id)
                    .join(TelegramAccount, TelegramAccount.user_id == User.id)
                    .where(
                        User.role == UserRole.KITCHEN_ADMIN,
                        User.kitchen_id == kitchen.id,
                        User.account_status == AccountStatus.APPROVED,
                        User.is_active.is_(True),
                        User.deleted_at.is_(None),
                        TelegramAccount.is_active.is_(True),
                    )
                )
            ).all()
        if not recipients:
            continue
        summaries = await build_kitchen_order_summaries(kitchen, today)
        action_specs = []
        if kitchen.delivery_start_time <= current_time:
            action_specs.append(("dispatch", OrderStatus.PREPARING))
        if kitchen.delivery_end_time <= current_time:
            action_specs.append(("delivered", OrderStatus.ON_THE_WAY))
        async with AsyncSessionLocal() as session:
            for action, source_status in action_specs:
                branch_ids = set(
                    (
                        await session.execute(
                            select(Order.branch_id)
                            .where(
                                Order.kitchen_id == kitchen.id,
                                Order.target_date == today,
                                Order.status == source_status,
                            )
                            .distinct()
                        )
                    ).scalars()
                )
                pending.extend(
                    (kitchen, user_id, chat_id, summary, action)
                    for user_id, chat_id in recipients
                    for summary in summaries
                    if summary.branch_id in branch_ids
                )

    bot = Bot(bot_settings.bot_token)
    sent = failed = 0
    try:
        for kitchen, user_id, chat_id, summary, action in pending:
            try:
                async with AsyncSessionLocal() as session:
                    prompt = (
                        await session.execute(
                            select(TelegramDeliveryPrompt).where(
                                TelegramDeliveryPrompt.kitchen_id == kitchen.id,
                                TelegramDeliveryPrompt.user_id == user_id,
                                TelegramDeliveryPrompt.branch_id == summary.branch_id,
                                TelegramDeliveryPrompt.target_date == today,
                                TelegramDeliveryPrompt.action == action,
                            )
                        )
                    ).scalar_one_or_none()
                    if prompt and (prompt.telegram_message_id or prompt.confirmed_at):
                        continue
                    if prompt is None:
                        prompt = TelegramDeliveryPrompt(
                            kitchen_id=kitchen.id,
                            user_id=user_id,
                            branch_id=summary.branch_id,
                            target_date=today,
                            action=action,
                        )
                        session.add(prompt)
                        await session.commit()
                    message = await bot.send_message(
                        chat_id,
                        format_delivery_prompt(summary, action),
                        parse_mode="HTML",
                        reply_markup=delivery_prompt_markup(prompt.id, action),
                    )
                    prompt.telegram_message_id = message.message_id
                    prompt.prompted_at = datetime.now(UTC)
                    await session.commit()
                    sent += 1
            except Exception as exc:
                failed += 1
                log.error(
                    "telegram_delivery_prompt_failed",
                    kitchen_id=kitchen.id,
                    branch_id=summary.branch_id,
                    action=action,
                    user_id=user_id,
                    error=str(exc),
                )
    finally:
        await bot.session.close()

    result = {
        "kitchens": len(kitchens),
        "pending": len(pending),
        "sent": sent,
        "failed": failed,
    }
    log.info("telegram_delivery_prompts", **result)
    return result


async def process_delivery_confirmation(
    *, telegram_user_id: int, prompt_id: str
) -> str:
    """Kitchen admin tasdig'i bilan bitta filial buyurtmalarini yo'lga chiqaradi."""
    actor = await get_linked_user(telegram_user_id)
    if actor.role != UserRole.KITCHEN_ADMIN or not actor.kitchen_id:
        raise TelegramApprovalError("Bu amal faqat Kitchen Admin uchun")

    async with AsyncSessionLocal() as session:
        prompt = (
            await session.execute(
                select(TelegramDeliveryPrompt)
                .where(TelegramDeliveryPrompt.id == prompt_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if prompt is None or prompt.kitchen_id != actor.kitchen_id:
            raise TelegramApprovalError("Yo'lga chiqarish so'rovi topilmadi")
        if prompt.confirmed_at:
            return "✅ Bu filial buyurtmalari allaqachon yo'lga chiqarilgan"

        if prompt.action == "delivered":
            source_status = OrderStatus.ON_THE_WAY
            target_status = OrderStatus.DELIVERED
        else:
            source_status = OrderStatus.PREPARING
            target_status = OrderStatus.ON_THE_WAY

        orders = (
            await session.execute(
                select(Order).where(
                    Order.kitchen_id == prompt.kitchen_id,
                    Order.branch_id == prompt.branch_id,
                    Order.target_date == prompt.target_date,
                    Order.status == source_status,
                )
            )
        ).scalars().all()
        for order in orders:
            await record_order_status(session, order, target_status)

        confirmed_at = datetime.now(UTC)
        await session.execute(
            update(TelegramDeliveryPrompt)
            .where(
                TelegramDeliveryPrompt.kitchen_id == prompt.kitchen_id,
                TelegramDeliveryPrompt.branch_id == prompt.branch_id,
                TelegramDeliveryPrompt.target_date == prompt.target_date,
                TelegramDeliveryPrompt.action == prompt.action,
            )
            .values(
                confirmed_at=confirmed_at,
                confirmed_by_user_id=actor.id,
            )
        )
        await session.commit()

    if not orders:
        return "✅ Bu filialda tasdiqlanadigan buyurtma qolmagan"
    if target_status == OrderStatus.DELIVERED:
        return f"✅ {len(orders)} ta buyurtma yetkazildi"
    return f"✅ {len(orders)} ta buyurtma yo'lga chiqarildi"
