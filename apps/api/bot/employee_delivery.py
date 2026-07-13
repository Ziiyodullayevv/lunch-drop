"""Yetkazish vaqti tugaganda buyurtmachiga app va Telegram xabari yuborish."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime
from html import escape
from zoneinfo import ZoneInfo

import structlog
from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.branch import Branch
from app.models.enums import OrderStatus
from app.models.kitchen import Kitchen
from app.models.order import Order, OrderItem
from app.models.telegram import EmployeeDeliveryNotice, TelegramAccount
from app.services.notification_service import notify
from bot.config import bot_settings

log = structlog.get_logger()


@dataclass(frozen=True)
class EmployeeDeliverySummary:
    kitchen_id: str
    kitchen_name: str
    company_name: str
    branch_id: str
    branch_name: str
    user_id: str
    target_date: date
    order_count: int
    portion_count: int
    meals: tuple[tuple[str, int], ...]


def format_employee_delivery_notice(summary: EmployeeDeliverySummary) -> str:
    meals = ", ".join(
        f"{escape(name)} ×{quantity}" for name, quantity in summary.meals
    )
    return "\n".join(
        [
            "<b>🚚 Yetkazish vaqti tugadi</b>",
            f"🏬 <b>Kompaniya:</b> {escape(summary.company_name)}",
            f"🏢 <b>Filial:</b> {escape(summary.branch_name)}",
            f"🍽 <b>Buyurtmangiz:</b> <i>{meals}</i>",
            "",
            "Buyurtmangiz yetib kelganini tekshiring.",
        ]
    )


async def _due_summaries(now: datetime) -> tuple[EmployeeDeliverySummary, ...]:
    today, current_time = now.date(), now.time()
    async with AsyncSessionLocal() as session:
        orders = (
            await session.execute(
                select(Order)
                .join(Kitchen, Order.kitchen_id == Kitchen.id)
                .options(
                    selectinload(Order.kitchen),
                    selectinload(Order.branch).selectinload(Branch.company),
                    selectinload(Order.items).selectinload(OrderItem.meal),
                )
                .where(
                    Order.target_date == today,
                    Order.status.in_([OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED]),
                    Kitchen.delivery_end_time <= current_time,
                )
            )
        ).scalars().all()

    grouped: dict[tuple[str, str, str], list[Order]] = defaultdict(list)
    for order in orders:
        grouped[(order.kitchen_id, order.branch_id, order.employee_id)].append(order)

    summaries = []
    for group_orders in grouped.values():
        first = group_orders[0]
        meal_totals: dict[str, int] = defaultdict(int)
        for order in group_orders:
            for item in order.items:
                meal_totals[item.meal.name if item.meal else "Taom"] += item.quantity
        summaries.append(
            EmployeeDeliverySummary(
                kitchen_id=first.kitchen_id,
                kitchen_name=first.kitchen.name if first.kitchen else "Oshxona",
                company_name=(
                    first.branch.company.name
                    if first.branch and first.branch.company
                    else "Kompaniya"
                ),
                branch_id=first.branch_id,
                branch_name=first.branch.name if first.branch else "Filial",
                user_id=first.employee_id,
                target_date=today,
                order_count=len(group_orders),
                portion_count=sum(meal_totals.values()),
                meals=tuple(sorted(meal_totals.items())),
            )
        )
    return tuple(summaries)


async def send_due_employee_delivery_notices(
    now: datetime | None = None,
) -> dict[str, int]:
    """Har bir user+filial uchun app xabari va imkon bo'lsa Telegram yuboradi."""
    local_now = now or datetime.now(ZoneInfo(settings.timezone))
    summaries = await _due_summaries(local_now)
    app_sent = telegram_sent = failed = 0
    bot = Bot(bot_settings.bot_token) if bot_settings.bot_token else None
    try:
        for summary in summaries:
            try:
                async with AsyncSessionLocal() as session:
                    notice = (
                        await session.execute(
                            select(EmployeeDeliveryNotice).where(
                                EmployeeDeliveryNotice.kitchen_id == summary.kitchen_id,
                                EmployeeDeliveryNotice.user_id == summary.user_id,
                                EmployeeDeliveryNotice.branch_id == summary.branch_id,
                                EmployeeDeliveryNotice.target_date == summary.target_date,
                            )
                        )
                    ).scalar_one_or_none()
                    if notice is None:
                        notice = EmployeeDeliveryNotice(
                            kitchen_id=summary.kitchen_id,
                            user_id=summary.user_id,
                            branch_id=summary.branch_id,
                            target_date=summary.target_date,
                        )
                        session.add(notice)
                        await session.flush()
                    if notice.app_notified_at is None:
                        await notify(
                            session,
                            summary.user_id,
                            "delivery_time_ended",
                            "Yetkazish vaqti tugadi",
                            f"{summary.company_name}, {summary.branch_name}: "
                            "buyurtmangiz yetib kelganini tekshiring.",
                        )
                        notice.app_notified_at = datetime.now(UTC)
                        app_sent += 1
                    await session.commit()

                    if bot is None or notice.telegram_notified_at is not None:
                        continue
                    chat_id = (
                        await session.execute(
                            select(TelegramAccount.chat_id).where(
                                TelegramAccount.user_id == summary.user_id,
                                TelegramAccount.is_active.is_(True),
                            )
                        )
                    ).scalar_one_or_none()
                    if chat_id is None:
                        continue
                    await bot.send_message(
                        chat_id,
                        format_employee_delivery_notice(summary),
                        parse_mode="HTML",
                    )
                    notice.telegram_notified_at = datetime.now(UTC)
                    await session.commit()
                    telegram_sent += 1
            except Exception as exc:
                failed += 1
                log.error(
                    "employee_delivery_notice_failed",
                    user_id=summary.user_id,
                    branch_id=summary.branch_id,
                    error=str(exc),
                )
    finally:
        if bot is not None:
            await bot.session.close()

    result = {
        "recipients": len(summaries),
        "app_sent": app_sent,
        "telegram_sent": telegram_sent,
        "failed": failed,
    }
    log.info("employee_delivery_notices", **result)
    return result
