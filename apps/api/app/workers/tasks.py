"""Avtomatik vazifalar — buyurtma status o'tishlari va invoicing.

Asia/Tashkent bo'yicha. Bu funksiyalar scheduler tomonidan chaqiriladi
(alohida jarayonda — uvicorn workerlarida emas, takrorlanmasligi uchun).
"""

from calendar import monthrange
from datetime import datetime
from zoneinfo import ZoneInfo

import structlog
from sqlalchemy import func, select

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.company import Company
from app.models.enums import ORDER_STATUS_LABELS, InvoiceStatus, OrderStatus
from app.models.invoice import Invoice, InvoiceBranchSummary, InvoiceEmployeeSummary
from app.models.branch import Branch
from app.models.kitchen import Kitchen
from app.models.order import Order
from app.models.user import User
from app.services.notification_service import notify

log = structlog.get_logger()


async def transition_order_statuses() -> dict:
    """Har 1 daqiqada: CREATED→PREPARING (cutoff), PREPARING→ON_THE_WAY (delivery_start)."""
    now = datetime.now(ZoneInfo(settings.timezone))
    today, current = now.date(), now.time()

    async with AsyncSessionLocal() as session:
        to_preparing = (
            await session.execute(
                select(Order)
                .join(Kitchen, Order.kitchen_id == Kitchen.id)
                .where(
                    Order.target_date == today,
                    Order.status == OrderStatus.CREATED,
                    Kitchen.order_cutoff_time <= current,
                )
            )
        ).scalars().all()
        for order in to_preparing:
            order.status = OrderStatus.PREPARING
            await notify(
                session, order.employee_id, "order_status",
                f"Buyurtma holati: {ORDER_STATUS_LABELS[OrderStatus.PREPARING]}",
                "Buyurtmangiz tayyorlanmoqda.",
            )
        await session.flush()

        to_on_the_way = (
            await session.execute(
                select(Order)
                .join(Kitchen, Order.kitchen_id == Kitchen.id)
                .where(
                    Order.target_date == today,
                    Order.status == OrderStatus.PREPARING,
                    Kitchen.delivery_start_time <= current,
                )
            )
        ).scalars().all()
        for order in to_on_the_way:
            order.status = OrderStatus.ON_THE_WAY
            await notify(
                session, order.employee_id, "order_status",
                f"Buyurtma holati: {ORDER_STATUS_LABELS[OrderStatus.ON_THE_WAY]}",
                "Buyurtmangiz yo'lda.",
            )
        await session.commit()

    result = {"to_preparing": len(to_preparing), "to_on_the_way": len(to_on_the_way)}
    log.info("status_transitions", **result)
    return result


async def generate_invoices() -> dict:
    """Har kuni 23:59: billing_day bugun bo'lgan kompaniyalar uchun invoice yaratadi."""
    now = datetime.now(ZoneInfo(settings.timezone))
    today = now.date()
    previous_year, previous_month = (today.year - 1, 12) if today.month == 1 else (today.year, today.month - 1)
    period_start = today.replace(year=previous_year, month=previous_month, day=1)
    period_end = today.replace(year=previous_year, month=previous_month, day=monthrange(previous_year, previous_month)[1])
    created = 0

    async with AsyncSessionLocal() as session:
        companies = (
            await session.execute(
                select(Company).where(
                    Company.billing_day == today.day, Company.deleted_at.is_(None)
                )
            )
        ).scalars().all()

        for company in companies:
            exists = (
                await session.execute(
                    select(Invoice.id).where(
                        Invoice.company_id == company.id, Invoice.period_end == period_end
                    )
                )
            ).first()
            if exists:
                continue

            expense, fee = (
                await session.execute(
                    select(
                        func.coalesce(func.sum(Order.historical_price), 0),
                        func.coalesce(func.sum(Order.system_fee), 0),
                    )
                    .join(User, Order.employee_id == User.id)
                    .where(
                        User.company_id == company.id,
                        Order.status == OrderStatus.DELIVERED,
                        Order.target_date.between(period_start, period_end),
                    )
                )
            ).one()
            if expense == 0:
                continue

            invoice = Invoice(
                    company_id=company.id,
                    period_start=period_start,
                    period_end=period_end,
                    total_company_expense=expense,
                    total_system_fee=fee,
                    total_kitchen_profit=expense - fee,
                    status=InvoiceStatus.PENDING,
                )
            session.add(invoice)
            await session.flush()
            branch_rows = (await session.execute(
                select(Order.branch_id, func.count(Order.id), func.sum(Order.historical_price), func.sum(Order.system_fee))
                .join(User, Order.employee_id == User.id)
                .where(User.company_id == company.id, Order.status == OrderStatus.DELIVERED, Order.target_date.between(period_start, period_end))
                .group_by(Order.branch_id)
            )).all()
            for branch_id, count, amount, branch_fee in branch_rows:
                invoice.branch_summaries.append(InvoiceBranchSummary(branch_id=branch_id, order_count=count, total_amount=amount, total_system_fee=branch_fee))
            employee_rows = (await session.execute(
                select(Order.employee_id, Order.branch_id, func.count(Order.id), func.sum(Order.historical_price), func.sum(Order.system_fee))
                .join(User, Order.employee_id == User.id)
                .where(User.company_id == company.id, Order.status == OrderStatus.DELIVERED, Order.target_date.between(period_start, period_end))
                .group_by(Order.employee_id, Order.branch_id)
            )).all()
            for employee_id, branch_id, count, amount, employee_fee in employee_rows:
                invoice.employee_summaries.append(InvoiceEmployeeSummary(employee_id=employee_id, branch_id=branch_id, order_count=count, total_amount=amount, total_system_fee=employee_fee))
            created += 1
        await session.commit()

    log.info("invoices_generated", count=created)
    return {"invoices_created": created}
