"""Kitchen Admin biznes logikasi — hammasi kitchen_id bo'yicha izolyatsiya qilingan."""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.enums import ORDER_STATUS_LABELS, OrderStatus
from app.models.kitchen import Kitchen
from app.models.kitchen import BranchKitchen
from app.models.company import Company
from app.models.branch import Branch
from app.models.meal import Meal, MenuCategory, MenuSchedule
from app.models.order import Order
from app.schemas.kitchen import KitchenMapBranchRead, KitchenMapCompanyRead, KitchenSettingsUpdate
from app.schemas.meal import MealCreate, MealUpdate, ScheduleMenuRequest
from app.schemas.order import OrderRead
from app.services.dashboard import (
    build_dashboard,
    connected_companies_card,
    order_card,
    order_count_card,
    period_today,
    period_week,
    revenue_card,
    today_tashkent,
)
from app.services.notification_service import notify
from app.services.order_read import build_order_read, build_order_reads

SYSTEM_FEE_RATE = Decimal("0.03")


class KitchenService:
    def __init__(self, session: AsyncSession, kitchen_id: str) -> None:
        self.session = session
        self.kitchen_id = kitchen_id

    # --- Oshxona sozlamalari (o'z oshxonasi) ---
    async def get_kitchen(self) -> Kitchen:
        kitchen = await self.session.get(Kitchen, self.kitchen_id)
        if kitchen is None or kitchen.deleted_at is not None:
            raise NotFoundError("Oshxona topilmadi")
        return kitchen

    async def update_settings(self, data: KitchenSettingsUpdate) -> Kitchen:
        kitchen = await self.get_kitchen()
        payload = data.model_dump(exclude_unset=True)
        for field, value in payload.items():
            setattr(kitchen, field, value)
        # Vaqt mantig'i: qabul ≤ yetkazish boshi < yetkazish oxiri
        if kitchen.order_cutoff_time > kitchen.delivery_start_time:
            raise ConflictError(
                "Buyurtma qabul vaqti yetkazish boshlanishidan kech bo'lmasin"
            )
        if kitchen.delivery_start_time >= kitchen.delivery_end_time:
            raise ConflictError("Yetkazish boshlanishi tugashidan oldin bo'lsin")
        await self.session.commit()
        return kitchen

    async def list_map_companies(self) -> list[KitchenMapCompanyRead]:
        companies = list(
            (
                await self.session.execute(
                    select(Company)
                    .where(Company.deleted_at.is_(None))
                    .order_by(Company.name)
                )
            ).scalars().all()
        )
        branches = list(
            (
                await self.session.execute(
                    select(Branch)
                    .where(Branch.deleted_at.is_(None))
                    .order_by(Branch.name)
                )
            ).scalars().all()
        )
        connected_branch_ids = set(
            (
                await self.session.execute(
                    select(BranchKitchen.branch_id).where(
                        BranchKitchen.kitchen_id == self.kitchen_id
                    )
                )
            ).scalars().all()
        )
        branches_by_company: dict[str, list[KitchenMapBranchRead]] = {}
        for branch in branches:
            branches_by_company.setdefault(branch.company_id, []).append(
                KitchenMapBranchRead(
                    id=branch.id,
                    name=branch.name,
                    address=branch.address,
                    lat=branch.lat,
                    lng=branch.lng,
                    connected_to_kitchen=branch.id in connected_branch_ids,
                )
            )
        return [
            KitchenMapCompanyRead(
                id=company.id,
                name=company.name,
                description=company.description,
                logo_url=company.logo_url,
                billing_day=company.billing_day,
                branches=branches_by_company.get(company.id, []),
            )
            for company in companies
        ]

    # --- Categories ---
    async def create_category(self, name: str) -> MenuCategory:
        category = MenuCategory(kitchen_id=self.kitchen_id, name=name)
        self.session.add(category)
        await self.session.commit()
        return category

    async def list_categories(self) -> list[MenuCategory]:
        result = await self.session.execute(
            select(MenuCategory).where(MenuCategory.kitchen_id == self.kitchen_id)
        )
        return list(result.scalars().all())

    async def _get_category(self, category_id: str) -> MenuCategory:
        cat = await self.session.get(MenuCategory, category_id)
        if cat is None or cat.kitchen_id != self.kitchen_id:
            raise NotFoundError("Kategoriya topilmadi")
        return cat

    # --- Meals ---
    async def create_meal(self, data: MealCreate) -> Meal:
        if data.category_id:
            await self._get_category(data.category_id)
        meal = Meal(kitchen_id=self.kitchen_id, **data.model_dump())
        self.session.add(meal)
        await self.session.commit()
        return meal

    async def list_meals(self, limit: int, offset: int) -> tuple[list[Meal], int]:
        base = select(Meal).where(
            Meal.kitchen_id == self.kitchen_id, Meal.deleted_at.is_(None)
        )
        items = (
            await self.session.execute(
                base.order_by(Meal.created_at.desc()).limit(limit).offset(offset)
            )
        ).scalars().all()
        total = (
            await self.session.execute(
                select(func.count()).select_from(Meal).where(
                    Meal.kitchen_id == self.kitchen_id, Meal.deleted_at.is_(None)
                )
            )
        ).scalar_one()
        return list(items), total

    async def get_meal(self, meal_id: str) -> Meal:
        meal = await self.session.get(Meal, meal_id)
        if (
            meal is None
            or meal.kitchen_id != self.kitchen_id
            or meal.deleted_at is not None
        ):
            raise NotFoundError("Taom topilmadi")
        return meal

    async def update_meal(self, meal_id: str, data: MealUpdate) -> Meal:
        meal = await self.get_meal(meal_id)
        payload = data.model_dump(exclude_unset=True)
        if payload.get("category_id"):
            await self._get_category(payload["category_id"])
        for field, value in payload.items():
            setattr(meal, field, value)
        await self.session.commit()
        return meal

    async def delete_meal(self, meal_id: str) -> None:
        meal = await self.get_meal(meal_id)
        meal.deleted_at = datetime.now(UTC)
        await self.session.commit()

    async def set_meal_image(self, meal_id: str, image_url: str) -> Meal:
        meal = await self.get_meal(meal_id)
        meal.image_url = image_url
        await self.session.commit()
        return meal

    # --- Menu schedule ---
    async def schedule_menu(self, data: ScheduleMenuRequest) -> MenuSchedule:
        await self.get_meal(data.meal_id)  # taom shu oshxonaniki ekanini tekshir
        schedule = MenuSchedule(
            kitchen_id=self.kitchen_id,
            meal_id=data.meal_id,
            day_of_week=data.day_of_week,
            specific_date=data.specific_date,
        )
        self.session.add(schedule)
        await self.session.commit()
        return schedule

    async def list_schedules(self, meal_id: str | None = None) -> list[MenuSchedule]:
        stmt = select(MenuSchedule).where(MenuSchedule.kitchen_id == self.kitchen_id)
        if meal_id:
            stmt = stmt.where(MenuSchedule.meal_id == meal_id)
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete_schedule(self, schedule_id: str) -> None:
        sched = await self.session.get(MenuSchedule, schedule_id)
        if sched is None or sched.kitchen_id != self.kitchen_id:
            raise NotFoundError("Jadval topilmadi")
        await self.session.delete(sched)
        await self.session.commit()

    # --- Orders ---
    async def list_orders(self, target_date=None) -> list[OrderRead]:
        stmt = select(Order).where(Order.kitchen_id == self.kitchen_id)
        if target_date is not None:
            stmt = stmt.where(Order.target_date == target_date)
        stmt = stmt.order_by(Order.created_at.desc())
        orders = list((await self.session.execute(stmt)).scalars().all())
        return await build_order_reads(self.session, orders)

    async def get_order(self, order_id: str) -> OrderRead:
        order = await self.session.get(Order, order_id)
        if order is None or order.kitchen_id != self.kitchen_id:
            raise NotFoundError("Buyurtma topilmadi")
        return await build_order_read(self.session, order)

    async def update_order_status(self, order_id: str, status: OrderStatus) -> OrderRead:
        order = await self.session.get(Order, order_id)
        if order is None or order.kitchen_id != self.kitchen_id:
            raise NotFoundError("Buyurtma topilmadi")
        if order.status == OrderStatus.CANCELLED:
            raise ConflictError("Bekor qilingan buyurtma o'zgartirilmaydi")
        # DELIVERED bo'lganda tizim 3% komissiya hisoblaydi (bir marta).
        if status == OrderStatus.DELIVERED and order.system_fee == 0:
            order.system_fee = (order.historical_price * SYSTEM_FEE_RATE).quantize(
                Decimal("0.01")
            )
        order.status = status
        await notify(
            self.session, order.employee_id, "order_status",
            f"Buyurtma holati: {ORDER_STATUS_LABELS[status]}",
            f"Buyurtmangiz holati '{ORDER_STATUS_LABELS[status]}' ga o'zgardi.",
        )
        await self.session.commit()
        return await build_order_read(self.session, order)

    # --- Dashboard ---
    async def dashboard(self, year: int | None = None) -> dict:
        """Oshxona bo'yicha analytics (faqat o'z kitchen_id)."""
        today = today_tashkent()
        year = year or today.year
        order_where = [Order.kitchen_id == self.kitchen_id]
        cards = [
            await order_count_card(
                self.session, order_where, False, "portions_today", today,
                period_today(today),
            ),
            await revenue_card(
                self.session, order_where, False, "weekly_revenue", today,
                period_week(today),
            ),
            await connected_companies_card(self.session, self.kitchen_id, today),
            await order_card(self.session, order_where, False, "orders_today", today),
            await order_card(
                self.session, order_where, False, "delivered_today", today,
                OrderStatus.DELIVERED,
            ),
            await order_card(
                self.session, order_where, False, "cancelled_today", today,
                OrderStatus.CANCELLED,
            ),
        ]
        return await build_dashboard(self.session, order_where, False, cards, year)
