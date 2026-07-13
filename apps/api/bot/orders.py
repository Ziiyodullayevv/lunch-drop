"""Cutoff tugagach oshxona adminlariga kunlik buyurtmalar jamlanmasini yuborish."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from html import escape
from zoneinfo import ZoneInfo

import structlog
from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.branch import Branch
from app.models.enums import AccountStatus, OrderStatus, UserRole
from app.models.kitchen import Kitchen
from app.models.order import Order, OrderItem
from app.models.telegram import (
    TelegramAccount,
    TelegramKitchenOrderSummaryDelivery,
)
from app.models.user import User
from bot.config import bot_settings

log = structlog.get_logger()


@dataclass(frozen=True)
class CustomerOrderSummary:
    name: str
    phone: str
    items: tuple[tuple[str, int], ...]
    total_amount: Decimal


@dataclass(frozen=True)
class KitchenOrderSummary:
    kitchen_name: str
    company_name: str
    branch_id: str
    branch_name: str
    target_date: date
    cutoff_time: str
    order_count: int
    portion_count: int
    total_amount: Decimal
    meals: tuple[tuple[str, int, Decimal], ...]
    customers: tuple[CustomerOrderSummary, ...]


def _price(value: Decimal) -> str:
    return f"{value:,.0f}".replace(",", " ")


def format_kitchen_order_summary(summary: KitchenOrderSummary) -> str:
    """Telegram uchun ixcham, oshxonaga tayyorlash sonlari aniq bo'lgan xabar."""
    lines = [
        f"<b>📋 {escape(summary.kitchen_name)} — kunlik buyurtmalar</b>",
        f"🏬 <b>Kompaniya:</b> {escape(summary.company_name)}",
        f"🏢 <b>Filial:</b> {escape(summary.branch_name)}",
        f"📅 <b>Sana:</b> {summary.target_date.strftime('%d.%m.%Y')}",
        f"⏰ <b>Qabul yopildi:</b> {summary.cutoff_time}",
        "",
        f"🧾 <b>Buyurtmalar:</b> {summary.order_count} ta",
        f"🍽 <b>Porsiyalar:</b> {summary.portion_count} ta",
        f"💰 <b>Jami:</b> {_price(summary.total_amount)} so'm",
    ]
    if summary.meals:
        lines.extend(["", "<b>Taomlar:</b>"])
        lines.extend(
            f"• <i>{escape(name)}</i> — <b>{quantity} ta</b> ({_price(amount)} so'm)"
            for name, quantity, amount in summary.meals
        )
    if summary.customers:
        lines.extend(["", "<b>Buyurtmachilar:</b>"])
        for index, customer in enumerate(summary.customers, start=1):
            items = ", ".join(
                f"{escape(name)} ×{quantity}" for name, quantity in customer.items
            )
            lines.extend(
                [
                    f"{index}. <b>{escape(customer.name)}</b> — {escape(customer.phone)}",
                    f"   <i>{items}</i> — <b>{_price(customer.total_amount)} so'm</b>",
                ]
            )
    return "\n".join(lines)


async def build_kitchen_order_summaries(
    kitchen: Kitchen, target_date: date
) -> tuple[KitchenOrderSummary, ...]:
    async with AsyncSessionLocal() as session:
        orders = (
            await session.execute(
                select(Order)
                .options(
                    selectinload(Order.items).selectinload(OrderItem.meal),
                    selectinload(Order.branch).selectinload(Branch.company),
                    selectinload(Order.employee),
                )
                .where(
                    Order.kitchen_id == kitchen.id,
                    Order.target_date == target_date,
                    Order.status != OrderStatus.CANCELLED,
                )
            )
        ).scalars().all()

    orders_by_branch: dict[str, list[Order]] = defaultdict(list)
    for order in orders:
        orders_by_branch[order.branch_id].append(order)

    summaries = []
    for branch_orders in orders_by_branch.values():
        meal_totals: dict[str, list] = defaultdict(lambda: [0, Decimal("0")])
        customer_totals: dict[str, dict] = {}
        total_amount = Decimal("0")
        portion_count = 0
        for order in branch_orders:
            customer = customer_totals.setdefault(
                order.employee_id,
                {
                    "name": order.employee.name if order.employee and order.employee.name else "Buyurtmachi",
                    "phone": order.employee.phone if order.employee else "—",
                    "items": defaultdict(int),
                    "total": Decimal("0"),
                },
            )
            for item in order.items:
                quantity = item.quantity
                amount = item.historical_price * quantity
                meal_name = item.meal.name if item.meal else "Taom"
                meal_totals[meal_name][0] += quantity
                meal_totals[meal_name][1] += amount
                customer["items"][meal_name] += quantity
                customer["total"] += amount
                portion_count += quantity
                total_amount += amount
        first_order = branch_orders[0]
        summaries.append(
            KitchenOrderSummary(
                kitchen_name=kitchen.name,
                company_name=(
                    first_order.branch.company.name
                    if first_order.branch and first_order.branch.company
                    else "Kompaniya"
                ),
                branch_id=first_order.branch_id,
                branch_name=first_order.branch.name if first_order.branch else "Filial",
                target_date=target_date,
                cutoff_time=kitchen.order_cutoff_time.strftime("%H:%M"),
                order_count=len(branch_orders),
                portion_count=portion_count,
                total_amount=total_amount,
                meals=tuple(
                    (name, values[0], values[1])
                    for name, values in sorted(meal_totals.items())
                ),
                customers=tuple(
                    CustomerOrderSummary(
                        name=values["name"],
                        phone=values["phone"],
                        items=tuple(sorted(values["items"].items())),
                        total_amount=values["total"],
                    )
                    for values in sorted(
                        customer_totals.values(), key=lambda value: value["name"]
                    )
                ),
            )
        )
    return tuple(sorted(summaries, key=lambda summary: summary.branch_name))


async def send_due_kitchen_order_summaries(
    now: datetime | None = None,
) -> dict[str, int]:
    """Cutoff o'tgan oshxonalarning bog'langan adminlariga jamlanma yuboradi."""
    local_now = now or datetime.now(ZoneInfo(settings.timezone))
    today, current_time = local_now.date(), local_now.time()

    async with AsyncSessionLocal() as session:
        kitchens = (
            await session.execute(
                select(Kitchen).where(
                    Kitchen.is_active.is_(True),
                    Kitchen.deleted_at.is_(None),
                    Kitchen.order_cutoff_time <= current_time,
                )
            )
        ).scalars().all()

    pending: list[tuple[Kitchen, str, int, KitchenOrderSummary]] = []
    async with AsyncSessionLocal() as session:
        for kitchen in kitchens:
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
            delivered = set(
                (
                    await session.execute(
                        select(
                            TelegramKitchenOrderSummaryDelivery.user_id,
                            TelegramKitchenOrderSummaryDelivery.branch_id,
                        ).where(
                            TelegramKitchenOrderSummaryDelivery.kitchen_id == kitchen.id,
                            TelegramKitchenOrderSummaryDelivery.target_date == today,
                        )
                    )
                ).all()
            )
            pending.extend(
                (kitchen, user_id, chat_id, summary)
                for user_id, chat_id in recipients
                for summary in summaries
                if (user_id, summary.branch_id) not in delivered
            )

    if not bot_settings.bot_token:
        return {"kitchens": len(kitchens), "pending": len(pending), "sent": 0, "failed": len(pending)}

    bot = Bot(bot_settings.bot_token)
    sent = failed = 0
    try:
        for kitchen, user_id, chat_id, summary in pending:
            try:
                await bot.send_message(
                    chat_id,
                    format_kitchen_order_summary(summary),
                    parse_mode="HTML",
                )
                async with AsyncSessionLocal() as session:
                    session.add(
                        TelegramKitchenOrderSummaryDelivery(
                            kitchen_id=kitchen.id,
                            user_id=user_id,
                            branch_id=summary.branch_id,
                            target_date=today,
                            sent_at=datetime.now(UTC),
                        )
                    )
                    try:
                        await session.commit()
                    except IntegrityError:
                        await session.rollback()
                sent += 1
            except Exception as exc:
                failed += 1
                log.error(
                    "telegram_kitchen_order_summary_failed",
                    kitchen_id=kitchen.id,
                    branch_id=summary.branch_id,
                    user_id=user_id,
                    chat_id=chat_id,
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
    log.info("telegram_kitchen_order_summaries", **result)
    return result
