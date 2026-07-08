"""Order'larni boyitilgan OrderRead'ga aylantirish (N+1 siz, batch).

Buyurtmaga bog'liq xodim ismi, filial, kompaniya, oshxona, taom nomlari qo'shiladi.
Uchala servis (kitchen/company/employee) shu yagona helper'dan foydalanadi.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.branch import Branch
from app.models.company import Company
from app.models.kitchen import Kitchen
from app.models.meal import Meal
from app.models.order import Order
from app.models.user import User
from app.schemas.order import OrderRead


async def build_order_reads(
    session: AsyncSession, orders: list[Order]
) -> list[OrderRead]:
    if not orders:
        return []

    async def _map(model, ids):
        ids = {i for i in ids if i}
        if not ids:
            return {}
        rows = await session.execute(select(model).where(model.id.in_(ids)))
        return {obj.id: obj for obj in rows.scalars().all()}

    employees = await _map(User, {o.employee_id for o in orders})
    branches = await _map(Branch, {o.branch_id for o in orders})
    kitchens = await _map(Kitchen, {o.kitchen_id for o in orders})
    meals = await _map(Meal, {o.meal_id for o in orders})
    companies = await _map(Company, {b.company_id for b in branches.values()})

    result: list[OrderRead] = []
    for o in orders:
        emp = employees.get(o.employee_id)
        branch = branches.get(o.branch_id)
        company = companies.get(branch.company_id) if branch else None
        result.append(
            OrderRead(
                id=o.id,
                employee_id=o.employee_id,
                kitchen_id=o.kitchen_id,
                meal_id=o.meal_id,
                target_date=o.target_date,
                historical_price=o.historical_price,
                system_fee=o.system_fee,
                status=o.status,
                created_at=o.created_at,
                employee_name=emp.name if emp else None,
                branch_id=o.branch_id,
                branch_name=branch.name if branch else None,
                company_id=branch.company_id if branch else None,
                company_name=company.name if company else None,
                kitchen_name=kitchens[o.kitchen_id].name if o.kitchen_id in kitchens else None,
                meal_name=meals[o.meal_id].name if o.meal_id in meals else None,
            )
        )
    return result


async def build_order_read(session: AsyncSession, order: Order) -> OrderRead:
    return (await build_order_reads(session, [order]))[0]
