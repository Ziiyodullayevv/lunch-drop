from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.branch import Branch
from app.models.company import Company
from app.models.enums import OrderStatus
from app.models.kitchen import BranchKitchen
from app.models.order import Order
from app.models.settlement_payment import SettlementPayment
from app.services.dashboard import today_tashkent
from app.schemas.settlement import (
    SettlementBranchRead,
    SettlementCompanyRead,
    SettlementPaymentCreate,
    SettlementPaymentRead,
    SettlementPaymentUpdate,
)


class SettlementService:
    def __init__(self, session: AsyncSession, kitchen_id: str) -> None:
        self.session = session
        self.kitchen_id = kitchen_id

    @staticmethod
    def _status(*, receivable: Decimal, paid: Decimal, billing_day: int, month: date) -> str:
        balance = max(Decimal("0"), receivable - paid)
        if balance == 0:
            return "paid"
        today = today_tashkent()
        if (today.year, today.month) > (month.year, month.month) or (
            (today.year, today.month) == (month.year, month.month) and today.day > billing_day
        ):
            return "overdue"
        if paid > 0:
            return "partial"
        return "pending"

    async def report(self, month: date) -> list[SettlementCompanyRead]:
        month_start = month.replace(day=1)
        month_end = date(month.year + 1, 1, 1) if month.month == 12 else date(month.year, month.month + 1, 1)
        branches = (await self.session.execute(
            select(Branch, Company)
            .join(BranchKitchen, BranchKitchen.branch_id == Branch.id)
            .join(Company, Company.id == Branch.company_id)
            .where(BranchKitchen.kitchen_id == self.kitchen_id, Branch.deleted_at.is_(None), Company.deleted_at.is_(None))
            .order_by(Company.name, Branch.name)
        )).all()
        aggregates = {
            branch_id: (count, gross or Decimal("0"), fee or Decimal("0"))
            for branch_id, count, gross, fee in (await self.session.execute(
                select(Order.branch_id, func.count(Order.id), func.sum(Order.historical_price), func.sum(Order.system_fee))
                .where(Order.kitchen_id == self.kitchen_id, Order.status == OrderStatus.DELIVERED,
                       Order.target_date >= month_start, Order.target_date < month_end)
                .group_by(Order.branch_id)
            )).all()
        }
        payments = (await self.session.execute(
            select(SettlementPayment).where(SettlementPayment.kitchen_id == self.kitchen_id,
                SettlementPayment.period_month == month_start).order_by(SettlementPayment.paid_at.desc(), SettlementPayment.created_at.desc())
        )).scalars().all()
        payments_by_company: dict[str, list[SettlementPayment]] = {}
        for payment in payments:
            payments_by_company.setdefault(payment.company_id, []).append(payment)
        companies: dict[str, dict] = {}
        for branch, company in branches:
            count, gross, fee = aggregates.get(branch.id, (0, Decimal("0"), Decimal("0")))
            entry = companies.setdefault(company.id, {"company": company, "orders": 0, "gross": Decimal("0"), "fee": Decimal("0"), "branches": []})
            entry["orders"] += count
            entry["gross"] += gross
            entry["fee"] += fee
            entry["branches"].append(SettlementBranchRead(branch_id=branch.id, branch_name=branch.name, orders_count=count, gross_amount=gross, system_fee=fee, kitchen_receivable=gross - fee))
        result = []
        for company_id, entry in companies.items():
            paid = sum((payment.amount for payment in payments_by_company.get(company_id, [])), Decimal("0"))
            receivable = entry["gross"] - entry["fee"]
            result.append(SettlementCompanyRead(
                company_id=company_id, company_name=entry["company"].name, billing_day=entry["company"].billing_day,
                orders_count=entry["orders"], gross_amount=entry["gross"], system_fee=entry["fee"], kitchen_receivable=receivable,
                paid_amount=paid, balance_amount=max(Decimal("0"), receivable - paid),
                status=self._status(receivable=receivable, paid=paid, billing_day=entry["company"].billing_day, month=month_start),
                branches=entry["branches"], payments=[SettlementPaymentRead.model_validate(p) for p in payments_by_company.get(company_id, [])],
            ))
        return result

    async def create_payment(self, body: SettlementPaymentCreate, user_id: str) -> SettlementPaymentRead:
        month = body.period_month.replace(day=1)
        linked = await self.session.scalar(select(BranchKitchen.id).join(Branch, Branch.id == BranchKitchen.branch_id).where(
            BranchKitchen.kitchen_id == self.kitchen_id, Branch.company_id == body.company_id, Branch.deleted_at.is_(None)))
        if linked is None:
            raise NotFoundError("Kompaniya ushbu oshxonaga ulanmagan")
        values = body.model_dump()
        values["period_month"] = month
        payment = SettlementPayment(**values, kitchen_id=self.kitchen_id, created_by_user_id=user_id)
        self.session.add(payment)
        await self.session.commit()
        await self.session.refresh(payment)
        return SettlementPaymentRead.model_validate(payment)

    async def update_payment(self, payment_id: str, body: SettlementPaymentUpdate) -> SettlementPaymentRead:
        payment = await self._payment(payment_id)
        for key, value in body.model_dump().items():
            setattr(payment, key, value)
        await self.session.commit()
        await self.session.refresh(payment)
        return SettlementPaymentRead.model_validate(payment)

    async def delete_payment(self, payment_id: str) -> None:
        payment = await self._payment(payment_id)
        await self.session.delete(payment)
        await self.session.commit()

    async def set_receipt(self, payment_id: str, receipt_url: str) -> SettlementPaymentRead:
        payment = await self._payment(payment_id)
        payment.receipt_url = receipt_url
        await self.session.commit()
        await self.session.refresh(payment)
        return SettlementPaymentRead.model_validate(payment)

    async def _payment(self, payment_id: str) -> SettlementPayment:
        payment = await self.session.get(SettlementPayment, payment_id)
        if payment is None or payment.kitchen_id != self.kitchen_id:
            raise NotFoundError("To'lov topilmadi")
        return payment
