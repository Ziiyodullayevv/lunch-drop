"""Production demo ma'lumotlari: bir yillik buyurtmalar va hisob-fakturalar.

Qayta ishga tushirish xavfsiz: demo telefon/date/meal/status kombinatsiyalari
bo'yicha mavjud yozuvlarni takrorlamaydi.
"""

from __future__ import annotations

import asyncio
import calendar
import sys
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.branch import Branch
from app.models.company import Company
from app.models.enums import AccountStatus, InvoiceStatus, OrderStatus, UserRole
from app.models.invoice import (
    EmployeeMonthlyPayment,
    Invoice,
    InvoiceBranchSummary,
    InvoiceEmployeeSummary,
)
from app.models.kitchen import BranchKitchen, Kitchen
from app.models.meal import Meal, MenuSchedule
from app.models.notification import Notification
from app.models.order import Order, OrderItem
from app.models.user import User

DEMO_PHONE = "+998997777777"
COMPANY_NAME = "Mars IT"
BRANCH_NAME = "Tinchlik filiali"


def month_start(value: date) -> date:
    return value.replace(day=1)


def shift_month(value: date, delta: int) -> date:
    index = value.year * 12 + value.month - 1 + delta
    return date(index // 12, index % 12 + 1, 1)


async def main() -> None:
    today = datetime.now(UTC).date()
    async with AsyncSessionLocal() as session:
        company = await session.scalar(
            select(Company).where(Company.name == COMPANY_NAME, Company.deleted_at.is_(None))
        )
        if company is None:
            raise RuntimeError(f"Kompaniya topilmadi: {COMPANY_NAME}")
        branch = await session.scalar(
            select(Branch).where(
                Branch.company_id == company.id,
                Branch.name == BRANCH_NAME,
                Branch.deleted_at.is_(None),
            )
        )
        if branch is None:
            raise RuntimeError(f"Filial topilmadi: {BRANCH_NAME}")
        user = await session.scalar(
            select(User).where(User.phone == DEMO_PHONE, User.role == UserRole.EMPLOYEE)
        )
        if user is None:
            raise RuntimeError(f"Demo xodim topilmadi: {DEMO_PHONE}")
        user.company_id = company.id
        user.account_status = AccountStatus.APPROVED
        user.is_active = True

        kitchen = await session.scalar(
            select(Kitchen)
            .join(BranchKitchen, BranchKitchen.kitchen_id == Kitchen.id)
            .where(BranchKitchen.branch_id == branch.id, Kitchen.deleted_at.is_(None))
        )
        if kitchen is None:
            raise RuntimeError("Tinchlik filialiga oshxona ulanmagan")
        meals = list(
            (
                await session.scalars(
                    select(Meal)
                    .where(Meal.kitchen_id == kitchen.id, Meal.deleted_at.is_(None))
                    .order_by(Meal.name)
                )
            ).all()
        )
        if not meals:
            raise RuntimeError("Oshxonada taomlar yo'q")
        for meal in meals:
            image_base = (meal.image_url or "").split("?", 1)[0]
            if image_base:
                meal.image_url = f"{image_base}?v=20260828"

        # Demo har kuni menyuni ko'rsin.
        existing_schedules = set(
            (
                await session.execute(
                    select(MenuSchedule.meal_id, MenuSchedule.day_of_week).where(
                        MenuSchedule.kitchen_id == kitchen.id,
                        MenuSchedule.specific_date.is_(None),
                    )
                )
            ).all()
        )
        for meal in meals:
            for weekday in range(1, 8):
                if (meal.id, weekday) not in existing_schedules:
                    session.add(
                        MenuSchedule(
                            kitchen_id=kitchen.id,
                            meal_id=meal.id,
                            day_of_week=weekday,
                        )
                    )

        existing_order_keys = set(
            (
                await session.execute(
                    select(Order.target_date, Order.meal_id, Order.status).where(
                        Order.employee_id == user.id
                    )
                )
            ).all()
        )
        created_orders: list[Order] = []

        def add_order(target: date, meal: Meal, status: OrderStatus) -> None:
            key = (target, meal.id, status)
            if key in existing_order_keys:
                return
            fee = meal.price * Decimal("0.03") if status == OrderStatus.DELIVERED else Decimal("0")
            order = Order(
                employee_id=user.id,
                branch_id=branch.id,
                kitchen_id=kitchen.id,
                meal_id=meal.id,
                target_date=target,
                historical_price=meal.price,
                system_fee=fee,
                status=status,
            )
            order.items.append(
                OrderItem(meal_id=meal.id, quantity=1, historical_price=meal.price)
            )
            session.add(order)
            created_orders.append(order)
            existing_order_keys.add(key)

        # 52 haftalik tarix — to'liq bir yil.
        for week in range(52, 0, -1):
            target = today - timedelta(days=week * 7)
            add_order(target, meals[week % len(meals)], OrderStatus.DELIVERED)

        # Bugungi dashboardda barcha asosiy statuslar ko'rinadi.
        today_statuses = (
            OrderStatus.CREATED,
            OrderStatus.PREPARING,
            OrderStatus.ON_THE_WAY,
            OrderStatus.DELIVERED,
        )
        for index, status in enumerate(today_statuses):
            add_order(today, meals[index], status)

        await session.flush()

        all_orders = list(
            (
                await session.scalars(
                    select(Order).where(Order.employee_id == user.id).order_by(Order.target_date)
                )
            ).all()
        )
        by_month: dict[date, list[Order]] = defaultdict(list)
        for order in all_orders:
            by_month[month_start(order.target_date)].append(order)

        # Oxirgi 12 oy uchun hisob-fakturalar va xodim to'lov holati.
        current_month = month_start(today)
        for offset in range(-11, 1):
            period_start = shift_month(current_month, offset)
            period_end = date(
                period_start.year,
                period_start.month,
                calendar.monthrange(period_start.year, period_start.month)[1],
            )
            month_orders = by_month.get(period_start, [])
            amount = sum((o.historical_price for o in month_orders), Decimal("0"))
            fee = sum((o.system_fee for o in month_orders), Decimal("0"))
            invoice = await session.scalar(
                select(Invoice).where(
                    Invoice.company_id == company.id,
                    Invoice.period_start == period_start,
                    Invoice.period_end == period_end,
                )
            )
            invoice_status = InvoiceStatus.PENDING if offset in (-1, 0) else InvoiceStatus.PAID
            if invoice is None:
                invoice = Invoice(
                    company_id=company.id,
                    period_start=period_start,
                    period_end=period_end,
                    total_company_expense=amount,
                    total_system_fee=fee,
                    total_kitchen_profit=amount - fee,
                    status=invoice_status,
                )
                invoice.branch_summaries.append(
                    InvoiceBranchSummary(
                        branch_id=branch.id,
                        order_count=len(month_orders),
                        total_amount=amount,
                        total_system_fee=fee,
                    )
                )
                invoice.employee_summaries.append(
                    InvoiceEmployeeSummary(
                        employee_id=user.id,
                        branch_id=branch.id,
                        order_count=len(month_orders),
                        total_amount=amount,
                        total_system_fee=fee,
                    )
                )
                session.add(invoice)
            payment = await session.scalar(
                select(EmployeeMonthlyPayment).where(
                    EmployeeMonthlyPayment.company_id == company.id,
                    EmployeeMonthlyPayment.employee_id == user.id,
                    EmployeeMonthlyPayment.period_month == period_start,
                )
            )
            if payment is None:
                session.add(
                    EmployeeMonthlyPayment(
                        company_id=company.id,
                        employee_id=user.id,
                        period_month=period_start,
                        status=invoice_status,
                    )
                )

        notification_titles = {
            "Demo: akkaunt tasdiqlandi": "Mars IT kompaniyasi Tinchlik filialiga kirishingizni tasdiqladi.",
            "Demo: buyurtma tayyorlanmoqda": "Bugungi buyurtmangiz oshxona tomonidan tayyorlanmoqda.",
            "Demo: buyurtma yo'lda": "Kuryer buyurtmangizni Tinchlik filialiga olib kelmoqda.",
            "Demo: buyurtma yetkazildi": "Buyurtmangiz muvaffaqiyatli yetkazildi.",
        }
        existing_titles = set(
            (
                await session.scalars(
                    select(Notification.title).where(
                        Notification.user_id == user.id,
                        Notification.title.in_(notification_titles),
                    )
                )
            ).all()
        )
        for title, body in notification_titles.items():
            if title not in existing_titles:
                session.add(
                    Notification(
                        user_id=user.id,
                        type="order_status",
                        title=title,
                        body=body,
                        is_read=False,
                    )
                )

        await session.commit()
        print(
            f"demo={DEMO_PHONE} orders={len(all_orders)} "
            f"new_orders={len(created_orders)} invoices=12 meals={len(meals)}"
        )


if __name__ == "__main__":
    asyncio.run(main())
