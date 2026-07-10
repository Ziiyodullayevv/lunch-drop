"""Telegram uchun xodim va Company Admin oylik hisobotlari."""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy import select

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.branch import Branch
from app.models.company import Company
from app.models.enums import ORDER_STATUS_LABELS, OrderStatus, UserRole
from app.models.meal import Meal
from app.models.order import Order
from app.models.user import User
from bot.approvals import TelegramApprovalError, get_linked_user

UZ_MONTHS = {
    1: "Yanvar",
    2: "Fevral",
    3: "Mart",
    4: "Aprel",
    5: "May",
    6: "Iyun",
    7: "Iyul",
    8: "Avgust",
    9: "Sentabr",
    10: "Oktabr",
    11: "Noyabr",
    12: "Dekabr",
}


@dataclass
class ReportView:
    text: str
    markup: InlineKeyboardMarkup


def current_month() -> str:
    return datetime.now(ZoneInfo(settings.timezone)).strftime("%Y-%m")


def parse_month(value: str) -> tuple[date, date]:
    try:
        year, month = (int(part) for part in value.split("-"))
        start = date(year, month, 1)
    except (TypeError, ValueError) as exc:
        raise TelegramApprovalError(
            "Oy formati noto'g'ri. Masalan: /hisobot 2026-07"
        ) from exc
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def shift_month(value: str, delta: int) -> str:
    start, _ = parse_month(value)
    index = start.year * 12 + start.month - 1 + delta
    return f"{index // 12:04d}-{index % 12 + 1:02d}"


def _money(value: Decimal) -> str:
    return f"{value:,.0f}".replace(",", " ")


def _title(month: str) -> str:
    start, _ = parse_month(month)
    return f"{UZ_MONTHS[start.month]} {start.year}"


def report_markup(role: UserRole, month: str) -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton(
                text="⬅️ Oldingi oy",
                callback_data=f"report:summary:{shift_month(month, -1)}",
            ),
            InlineKeyboardButton(
                text="Keyingi oy ➡️",
                callback_data=f"report:summary:{shift_month(month, 1)}",
            ),
        ],
        [
            InlineKeyboardButton(
                text="📜 Buyurtmalar tarixi",
                callback_data=f"report:orders:{month}",
            )
        ],
    ]
    if role == UserRole.COMPANY_ADMIN:
        rows.append(
            [
                InlineKeyboardButton(
                    text="👥 Xodimlar",
                    callback_data=f"report:employees:{month}",
                ),
                InlineKeyboardButton(
                    text="🏢 Filiallar",
                    callback_data=f"report:branches:{month}",
                ),
            ]
        )
    if role == UserRole.EMPLOYEE:
        rows.append(
            [
                InlineKeyboardButton(
                    text="🍽 Bugungi menyu", callback_data="report:menu:today"
                )
            ]
        )
    return InlineKeyboardMarkup(inline_keyboard=rows)


async def _orders_for_actor(session, actor: User, month: str):
    start, end = parse_month(month)
    filters = [Order.target_date >= start, Order.target_date < end]
    if actor.role == UserRole.EMPLOYEE:
        filters.append(Order.employee_id == actor.id)
    elif actor.role == UserRole.COMPANY_ADMIN and actor.company_id:
        filters.append(User.company_id == actor.company_id)
    else:
        raise TelegramApprovalError("/hisobot faqat xodim va Company Admin uchun")
    return (
        await session.execute(
            select(Order, User, Meal, Branch)
            .join(User, User.id == Order.employee_id)
            .join(Meal, Meal.id == Order.meal_id)
            .join(Branch, Branch.id == Order.branch_id)
            .where(*filters)
            .order_by(Order.target_date.desc(), Order.created_at.desc())
        )
    ).all()


async def build_report(
    telegram_user_id: int,
    *,
    month: str | None = None,
    section: str = "summary",
) -> ReportView:
    actor = await get_linked_user(telegram_user_id)
    if actor.role not in (UserRole.EMPLOYEE, UserRole.COMPANY_ADMIN):
        raise TelegramApprovalError("/hisobot faqat xodim va Company Admin uchun")
    month = month or current_month()
    parse_month(month)

    async with AsyncSessionLocal() as session:
        actor = await session.get(User, actor.id)
        if actor is None:
            raise TelegramApprovalError("Foydalanuvchi topilmadi")
        company = (
            await session.get(Company, actor.company_id) if actor.company_id else None
        )
        rows = await _orders_for_actor(session, actor, month)

    delivered = [row for row in rows if row[0].status == OrderStatus.DELIVERED]
    total_expense = sum((row[0].historical_price for row in delivered), Decimal("0"))
    period = _title(month)
    payment_day = (
        f"Har oyning {company.billing_day}-kuni" if company else "Belgilanmagan"
    )

    if section == "summary":
        owner = (
            actor.name or actor.phone
            if actor.role == UserRole.EMPLOYEE
            else (company.name if company else "Kompaniya")
        )
        text = (
            f"📊 Hisobot — {period}\n\n"
            f"👤 {owner}\n"
            f"💳 Jami qarz/xarajat: {_money(total_expense)} so'm\n"
            f"📅 To'lov kuni: {payment_day}\n"
            f"✅ Yetkazilgan buyurtmalar: {len(delivered)} ta\n"
            f"📦 Barcha buyurtmalar: {len(rows)} ta"
        )
    elif section == "orders":
        lines = [f"📜 Buyurtmalar tarixi — {period}", ""]
        for order, employee, meal, branch in rows[:40]:
            employee_text = (
                f" · {employee.name or employee.phone}"
                if actor.role == UserRole.COMPANY_ADMIN
                else ""
            )
            lines.append(
                f"{order.target_date.strftime('%d.%m')} · {meal.name} · "
                f"{_money(order.historical_price)} so'm\n"
                f"{ORDER_STATUS_LABELS[order.status]} · {branch.name}{employee_text}"
            )
        if not rows:
            lines.append("Bu oyda buyurtmalar yo'q")
        if len(rows) > 40:
            lines.append(f"\nYana {len(rows) - 40} ta buyurtma mavjud.")
        text = "\n\n".join(lines)
    elif section == "employees" and actor.role == UserRole.COMPANY_ADMIN:
        grouped: dict[str, tuple[str, int, Decimal]] = {}
        for order, employee, _meal, _branch in delivered:
            name, count, amount = grouped.get(
                employee.id, (employee.name or employee.phone, 0, Decimal("0"))
            )
            grouped[employee.id] = (name, count + 1, amount + order.historical_price)
        lines = [f"👥 Xodimlar kesimida — {period}", ""]
        for name, count, amount in sorted(
            grouped.values(), key=lambda item: item[2], reverse=True
        ):
            lines.append(f"• {name}: {count} ta · {_money(amount)} so'm")
        if not grouped:
            lines.append("Bu oyda yetkazilgan buyurtmalar yo'q")
        lines.append(f"\nJami: {_money(total_expense)} so'm")
        text = "\n".join(lines)
    elif section == "branches" and actor.role == UserRole.COMPANY_ADMIN:
        grouped_branch: dict[str, tuple[str, int, Decimal]] = {}
        for order, _employee, _meal, branch in delivered:
            name, count, amount = grouped_branch.get(
                branch.id, (branch.name, 0, Decimal("0"))
            )
            grouped_branch[branch.id] = (
                name,
                count + 1,
                amount + order.historical_price,
            )
        lines = [f"🏢 Filiallar kesimida — {period}", ""]
        for name, count, amount in sorted(
            grouped_branch.values(), key=lambda item: item[2], reverse=True
        ):
            lines.append(f"• {name}: {count} ta · {_money(amount)} so'm")
        if not grouped_branch:
            lines.append("Bu oyda yetkazilgan buyurtmalar yo'q")
        lines.append(f"\nJami: {_money(total_expense)} so'm")
        text = "\n".join(lines)
    else:
        raise TelegramApprovalError("Bu hisobot bo'limiga ruxsat yo'q")

    return ReportView(text=text[:4096], markup=report_markup(actor.role, month))
