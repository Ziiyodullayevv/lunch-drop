"""Employee biznes logikasi — onboarding, menyu, buyurtma."""

import asyncio

from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationAppError,
)
from app.models.branch import Branch, EmployeeBranch
from app.models.company import Company
from app.models.enums import ORDER_STATUS_LABELS, AccountStatus, OrderStatus
from app.models.kitchen import BranchKitchen, Kitchen
from app.models.meal import Meal, MenuSchedule
from app.models.order import Order, OrderItem
from app.models.user import User
from app.schemas.employee import (
    BranchPublic,
    CompanyPublic,
    EmployeeProfileUpdate,
    EmployeeStatusRead,
    MenuMealRead,
    MenuResponse,
    OrderCreate,
    OrderHistoryMealItem,
    OrderHistoryItem,
)
from app.schemas.order import OrderRead
from app.services.order_read import build_order_read
from app.services.order_status import record_order_status
from bot.notifier import send_approval_notification


class EmployeeService:
    def __init__(self, session: AsyncSession, user: User) -> None:
        self.session = session
        self.user = user

    def _now(self) -> datetime:
        return datetime.now(ZoneInfo(settings.timezone))

    # --- Onboarding ---
    async def list_companies(self, search: str | None = None) -> list[CompanyPublic]:
        stmt = select(Company).where(Company.deleted_at.is_(None))
        if search:
            stmt = stmt.where(Company.name.ilike(f"%{search.strip()}%"))
        companies = (
            await self.session.execute(stmt.order_by(Company.name))
        ).scalars().all()
        result: list[CompanyPublic] = []
        for c in companies:
            branches = (
                await self.session.execute(
                    select(Branch).where(
                        Branch.company_id == c.id, Branch.deleted_at.is_(None)
                    )
                )
            ).scalars().all()
            result.append(
                CompanyPublic(
                    id=c.id,
                    name=c.name,
                    branches=[BranchPublic.model_validate(b) for b in branches],
                )
            )
        return result

    async def _my_branches(self) -> list[Branch]:
        rows = await self.session.execute(
            select(Branch)
            .join(EmployeeBranch, EmployeeBranch.branch_id == Branch.id)
            .where(
                EmployeeBranch.user_id == self.user.id, Branch.deleted_at.is_(None)
            )
            .order_by(Branch.name)
        )
        return list(rows.scalars().all())

    async def _my_branch_ids(self) -> set[str]:
        rows = await self.session.execute(
            select(EmployeeBranch.branch_id).where(
                EmployeeBranch.user_id == self.user.id
            )
        )
        return {r[0] for r in rows.all()}

    async def join_branches(self, branch_ids: list[str]) -> EmployeeStatusRead:
        """Bir nechta filialga a'zolik (bitta kompaniya doirasida). A'zolik almashtiriladi."""
        unique_ids = list(dict.fromkeys(branch_ids))  # tartibni saqlab dublikatni olib tashlash
        branches: list[Branch] = []
        for bid in unique_ids:
            branch = await self.session.get(Branch, bid)
            if branch is None or branch.deleted_at is not None:
                raise NotFoundError(f"Filial topilmadi: {bid}")
            branches.append(branch)

        company_ids = {b.company_id for b in branches}
        if len(company_ids) > 1:
            raise ConflictError("Barcha filiallar bitta kompaniyaga tegishli bo'lishi kerak")

        # Eski a'zoliklarni almashtiramiz
        existing = await self.session.execute(
            select(EmployeeBranch).where(EmployeeBranch.user_id == self.user.id)
        )
        for link in existing.scalars().all():
            await self.session.delete(link)
        for branch in branches:
            self.session.add(EmployeeBranch(user_id=self.user.id, branch_id=branch.id))

        self.user.company_id = company_ids.pop()
        self.user.account_status = AccountStatus.PENDING_APPROVAL
        await self.session.commit()
        asyncio.create_task(send_approval_notification(self.user.id))
        return EmployeeStatusRead(
            account_status=self.user.account_status,
            company_id=self.user.company_id,
            branches=[BranchPublic.model_validate(b) for b in branches],
        )

    async def my_status(self) -> EmployeeStatusRead:
        branches = await self._my_branches()
        branch_ids = [branch.id for branch in branches]
        kitchen_names = []
        if branch_ids:
            kitchen_names = list((await self.session.execute(
                select(Kitchen.name)
                .join(BranchKitchen, BranchKitchen.kitchen_id == Kitchen.id)
                .where(
                    BranchKitchen.branch_id.in_(branch_ids),
                    Kitchen.is_active.is_(True),
                    Kitchen.deleted_at.is_(None),
                )
                .distinct()
                .order_by(Kitchen.name)
            )).scalars().all())
        return EmployeeStatusRead(
            account_status=self.user.account_status,
            company_id=self.user.company_id,
            branches=[BranchPublic.model_validate(b) for b in branches],
            kitchen_names=kitchen_names,
        )

    # --- Profil ---
    async def update_me(self, data: EmployeeProfileUpdate) -> User:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(self.user, field, value)
        await self.session.commit()
        return self.user

    def _require_approved(self) -> None:
        if self.user.account_status != AccountStatus.APPROVED:
            raise PermissionDeniedError(
                "Avval kompaniyaga qo'shiling va tasdiqlanishni kuting"
            )

    # --- Menyu (specific_date > day_of_week ustunligi) ---
    async def _kitchen_ids_for_branches(self, branch_ids: set[str]) -> set[str]:
        if not branch_ids:
            return set()
        rows = await self.session.execute(
            select(BranchKitchen.kitchen_id).where(
                BranchKitchen.branch_id.in_(branch_ids)
            )
        )
        return {r[0] for r in rows.all()}

    async def _available_meal_ids(self, kitchen_id: str, target_date: date) -> set[str]:
        weekday = target_date.isoweekday()
        specific = (
            await self.session.execute(
                select(MenuSchedule.meal_id).where(
                    MenuSchedule.kitchen_id == kitchen_id,
                    MenuSchedule.specific_date == target_date,
                )
            )
        ).scalars().all()
        if specific:  # maxsus sana menyusi haftalikni almashtiradi
            return set(specific)
        weekly = (
            await self.session.execute(
                select(MenuSchedule.meal_id).where(
                    MenuSchedule.kitchen_id == kitchen_id,
                    MenuSchedule.day_of_week == weekday,
                    MenuSchedule.specific_date.is_(None),
                )
            )
        ).scalars().all()
        return set(weekly)

    async def menu(self, target_date: date, branch_id: str | None = None) -> MenuResponse:
        """Menyu — xodim a'zo bo'lgan filiallar oshxonalaridan.

        `branch_id` berilsa — faqat o'sha filial; aks holda barcha a'zo filiallar birlashmasi.
        """
        self._require_approved()
        my_branch_ids = await self._my_branch_ids()
        if branch_id is not None:
            if branch_id not in my_branch_ids:
                raise PermissionDeniedError("Siz bu filialga a'zo emassiz")
            branch_ids = {branch_id}
        else:
            branch_ids = my_branch_ids

        kitchens_map: dict[str, Kitchen] = {}
        meal_ids: set[str] = set()
        for kid in await self._kitchen_ids_for_branches(branch_ids):
            kitchen = await self.session.get(Kitchen, kid)
            if kitchen is None or not kitchen.is_active or kitchen.deleted_at is not None:
                continue
            kitchens_map[kid] = kitchen
            meal_ids |= await self._available_meal_ids(kid, target_date)
        if not meal_ids:
            return MenuResponse(target_date=target_date, items=[])
        meals = (
            await self.session.execute(
                select(Meal).where(Meal.id.in_(meal_ids), Meal.deleted_at.is_(None))
            )
        ).scalars().all()
        items = []
        for meal in meals:
            k = kitchens_map.get(meal.kitchen_id)
            items.append(
                MenuMealRead(
                    id=meal.id,
                    kitchen_id=meal.kitchen_id,
                    category_id=meal.category_id,
                    name=meal.name,
                    description=meal.description,
                    price=meal.price,
                    image_url=meal.image_url,
                    kitchen_name=k.name if k else None,
                    order_cutoff_time=k.order_cutoff_time if k else None,
                    delivery_start_time=k.delivery_start_time if k else None,
                    delivery_end_time=k.delivery_end_time if k else None,
                )
            )
        return MenuResponse(target_date=target_date, items=items)

    # --- Buyurtma ---
    async def create_order(
        self, data: OrderCreate, *, commit: bool = True
    ) -> OrderRead:
        self._require_approved()
        now = self._now()
        today = now.date()

        if data.target_date < today:
            raise PermissionDeniedError("O'tgan sanaga buyurtma berib bo'lmaydi")

        # Tanlangan filial xodimning a'zoligida bormi? (bugun qaysi filialdasiz)
        if data.branch_id not in await self._my_branch_ids():
            raise PermissionDeniedError("Siz bu filialga a'zo emassiz")

        # Oshxona tanlangan filialga ulanganmi?
        link = (
            await self.session.execute(
                select(BranchKitchen).where(
                    BranchKitchen.branch_id == data.branch_id,
                    BranchKitchen.kitchen_id == data.kitchen_id,
                )
            )
        ).scalar_one_or_none()
        if link is None:
            raise PermissionDeniedError("Bu oshxona tanlangan filialga ulanmagan")

        kitchen = await self.session.get(Kitchen, data.kitchen_id)
        if kitchen is None or not kitchen.is_active:
            raise NotFoundError("Oshxona topilmadi")
        if data.target_date == today and now.time() >= kitchen.order_cutoff_time:
            raise PermissionDeniedError("Buyurtma qabul qilish vaqti tugagan")

        requested = {item.meal_id: item.quantity for item in data.items}
        available_meal_ids = await self._available_meal_ids(data.kitchen_id, data.target_date)
        if not set(requested).issubset(available_meal_ids):
            raise PermissionDeniedError("Tanlangan taomlardan biri bu kunda mavjud emas")

        meals = list((await self.session.execute(
            select(Meal).where(
                Meal.id.in_(requested), Meal.kitchen_id == data.kitchen_id, Meal.deleted_at.is_(None)
            )
        )).scalars().all())
        if len(meals) != len(requested):
            raise NotFoundError("Tanlangan taomlardan biri topilmadi")
        meals_by_id = {meal.id: meal for meal in meals}
        first = meals_by_id[data.items[0].meal_id]
        total = sum(meals_by_id[item.meal_id].price * item.quantity for item in data.items)

        order = Order(
            employee_id=self.user.id,
            branch_id=data.branch_id,
            kitchen_id=data.kitchen_id,
            meal_id=first.id,
            target_date=data.target_date,
            historical_price=total,
            status=OrderStatus.CREATED,
        )
        order.items = [
            OrderItem(
                meal_id=item.meal_id,
                quantity=item.quantity,
                historical_price=meals_by_id[item.meal_id].price,
            )
            for item in data.items
        ]
        self.session.add(order)
        await self.session.flush()
        await record_order_status(
            self.session, order, OrderStatus.CREATED, update_order=False
        )
        if commit:
            await self.session.commit()
        else:
            await self.session.flush()
        return await build_order_read(self.session, order)

    # --- Buyurtmalar tarixi ---
    @staticmethod
    def _to_history_item(
        order: Order, meal: Meal, kitchen: Kitchen, branch: Branch, meals_by_id: dict[str, Meal]
    ) -> OrderHistoryItem:
        return OrderHistoryItem(
            id=order.id,
            target_date=order.target_date,
            status=order.status,
            status_label=ORDER_STATUS_LABELS[order.status],
            historical_price=order.historical_price,
            system_fee=order.system_fee,
            meal_id=order.meal_id,
            meal_name=meal.name,
            meal_image_url=meal.image_url,
            kitchen_id=order.kitchen_id,
            kitchen_name=kitchen.name,
            branch_id=order.branch_id,
            branch_name=branch.name,
            created_at=order.created_at,
            items=[
                OrderHistoryMealItem(
                    meal_id=item.meal_id,
                    meal_name=meals_by_id[item.meal_id].name,
                    meal_image_url=meals_by_id[item.meal_id].image_url,
                    quantity=item.quantity,
                    historical_price=item.historical_price,
                )
                for item in order.items
                if item.meal_id in meals_by_id
            ],
        )

    @staticmethod
    def _month_range(month: str) -> tuple[date, date]:
        """"YYYY-MM" → (oyning birinchi kuni, keyingi oyning birinchi kuni)."""
        try:
            year, mon = (int(p) for p in month.split("-"))
            start = date(year, mon, 1)
        except (ValueError, TypeError) as exc:
            raise ValidationAppError("Oy formati noto'g'ri (YYYY-MM)") from exc
        end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
        return start, end

    async def list_orders(
        self,
        month: str | None,
        target_date: date | None,
        status: OrderStatus | None,
        limit: int,
        offset: int,
    ) -> tuple[list[OrderHistoryItem], int]:
        """O'z buyurtmalari tarixi — kunlik (target_date) yoki oylik (month=YYYY-MM)."""
        filters = [Order.employee_id == self.user.id]
        if target_date is not None:
            filters.append(Order.target_date == target_date)
        elif month is not None:
            start, end = self._month_range(month)
            filters.append(Order.target_date >= start)
            filters.append(Order.target_date < end)
        if status is not None:
            filters.append(Order.status == status)

        base = (
            select(Order, Meal, Kitchen, Branch)
            .join(Meal, Order.meal_id == Meal.id)
            .join(Kitchen, Order.kitchen_id == Kitchen.id)
            .join(Branch, Order.branch_id == Branch.id)
            .where(*filters)
        )
        rows = (
            await self.session.execute(
                base.order_by(Order.target_date.desc(), Order.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).all()
        total = (
            await self.session.execute(
                select(func.count()).select_from(Order).where(*filters)
            )
        ).scalar_one()
        item_meal_ids = {item.meal_id for o, *_ in rows for item in o.items}
        item_meals = list((await self.session.execute(
            select(Meal).where(Meal.id.in_(item_meal_ids))
        )).scalars().all()) if item_meal_ids else []
        meals_by_id = {meal.id: meal for meal in item_meals}
        items = [self._to_history_item(o, m, k, b, meals_by_id) for o, m, k, b in rows]
        return items, total

    async def get_order_detail(self, order_id: str) -> OrderHistoryItem:
        order = await self._own_order(order_id)
        meal = await self.session.get(Meal, order.meal_id)
        kitchen = await self.session.get(Kitchen, order.kitchen_id)
        branch = await self.session.get(Branch, order.branch_id)
        item_meals = list((await self.session.execute(
            select(Meal).where(Meal.id.in_({item.meal_id for item in order.items}))
        )).scalars().all())
        return self._to_history_item(
            order, meal, kitchen, branch, {item.id: item for item in item_meals}
        )

    async def _own_order(self, order_id: str) -> Order:
        order = await self.session.get(Order, order_id)
        if order is None or order.employee_id != self.user.id:
            raise NotFoundError("Buyurtma topilmadi")
        return order

    async def confirm_delivery(self, order_id: str) -> OrderRead:
        order = await self._own_order(order_id)
        if order.status == OrderStatus.DELIVERED:
            return await build_order_read(self.session, order)
        if order.status != OrderStatus.ON_THE_WAY:
            raise ConflictError("Faqat yo'ldagi buyurtmani yetkazildi deb tasdiqlash mumkin")
        await record_order_status(self.session, order, OrderStatus.DELIVERED)
        await self.session.commit()
        return await build_order_read(self.session, order)

    async def cancel_order(self, order_id: str) -> OrderRead:
        order = await self._own_order(order_id)
        if order.status != OrderStatus.CREATED:
            raise ConflictError("Faqat CREATED buyurtmani bekor qilish mumkin")
        now = self._now()
        kitchen = await self.session.get(Kitchen, order.kitchen_id)
        passed = order.target_date < now.date() or (
            order.target_date == now.date()
            and kitchen is not None
            and now.time() >= kitchen.order_cutoff_time
        )
        if passed:
            raise ConflictError("Bekor qilish vaqti o'tgan")
        await record_order_status(self.session, order, OrderStatus.CANCELLED)
        await self.session.commit()
        return await build_order_read(self.session, order)
