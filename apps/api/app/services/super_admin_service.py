"""Super admin biznes logikasi — companies/kitchens/branches CRUD, assign, admin, dashboard."""

from datetime import UTC, date, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.branch import Branch
from app.models.company import Company
from app.models.enums import (
    AccountStatus,
    InvoiceStatus,
    OrderStatus,
    UserRole,
)
from app.models.kitchen import BranchKitchen, Kitchen
from app.models.order import Order
from app.models.user import User
from app.repositories.branch_repo import BranchRepository
from app.repositories.company_repo import CompanyRepository
from app.repositories.kitchen_repo import KitchenRepository
from app.repositories.user_repo import UserRepository
from app.schemas.auth import PendingAdminRead
from app.schemas.branch import BranchCreate, BranchUpdate
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.schemas.kitchen import KitchenCreate, KitchenUpdate
from app.schemas.order import OrderRead
from app.schemas.company_admin import InvoiceCustomerRead, InvoiceCustomerDetailRead
from app.schemas.user_admin import UserAdminUpdate
from app.services.dashboard import (
    build_dashboard,
    distinct_card,
    order_card,
    order_count_card,
    period_year,
    revenue_card,
    snapshot_card,
    today_tashkent,
)
from app.services.notification_service import notify
from app.services.order_read import build_order_read, build_order_reads
from app.services.order_status import record_order_status
from app.services.company_service import CompanyAdminService


class SuperAdminService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.companies = CompanyRepository(session)
        self.kitchens = KitchenRepository(session)
        self.branches = BranchRepository(session)
        self.users = UserRepository(session)

    async def list_invoice_customers(
        self, month: date, company_id: str | None = None
    ) -> list[InvoiceCustomerRead]:
        query = select(Company).where(Company.deleted_at.is_(None))
        if company_id:
            query = query.where(Company.id == company_id)
        companies = list((await self.session.execute(query.order_by(Company.name))).scalars().all())
        customers: list[InvoiceCustomerRead] = []
        for company in companies:
            customers.extend(
                await CompanyAdminService(self.session, company.id).list_invoice_customers(month)
            )
        return customers

    async def get_invoice_customer(
        self, employee_id: str, month: date
    ) -> InvoiceCustomerDetailRead:
        employee = await self.session.scalar(
            select(User).where(User.id == employee_id, User.deleted_at.is_(None))
        )
        if employee is None or not employee.company_id:
            raise NotFoundError("Xodim topilmadi")
        return await CompanyAdminService(
            self.session, employee.company_id
        ).get_invoice_customer(employee_id, month)

    async def update_invoice_customer_status(
        self, employee_id: str, month: date, status: InvoiceStatus
    ) -> InvoiceCustomerRead:
        employee = await self.session.scalar(
            select(User).where(User.id == employee_id, User.deleted_at.is_(None))
        )
        if employee is None or not employee.company_id:
            raise NotFoundError("Xodim topilmadi")
        return await CompanyAdminService(
            self.session, employee.company_id
        ).update_invoice_customer_status(employee_id, month, status)

    # --- Companies ---
    async def create_company(self, data: CompanyCreate) -> Company:
        company = await self.companies.add(Company(**data.model_dump()))
        await self.session.commit()
        return company

    async def list_companies(self, limit: int, offset: int) -> tuple[list[Company], int]:
        return await self.companies.list(limit=limit, offset=offset), await self.companies.count()

    async def get_company(self, company_id: str) -> Company:
        company = await self.companies.get(company_id)
        if company is None:
            raise NotFoundError("Kompaniya topilmadi")
        return company

    async def update_company(self, company_id: str, data: CompanyUpdate) -> Company:
        company = await self.get_company(company_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(company, field, value)
        await self.session.commit()
        return company

    async def delete_company(self, company_id: str) -> None:
        company = await self.get_company(company_id)
        await self.companies.soft_delete(company)
        await self.session.commit()

    # --- Kitchens ---
    async def create_kitchen(self, data: KitchenCreate) -> Kitchen:
        kitchen = await self.kitchens.add(Kitchen(**data.model_dump()))
        await self.session.commit()
        return kitchen

    async def list_kitchens(self, limit: int, offset: int) -> tuple[list[Kitchen], int]:
        return await self.kitchens.list(limit=limit, offset=offset), await self.kitchens.count()

    async def get_kitchen(self, kitchen_id: str) -> Kitchen:
        kitchen = await self.kitchens.get(kitchen_id)
        if kitchen is None:
            raise NotFoundError("Oshxona topilmadi")
        return kitchen

    async def update_kitchen(self, kitchen_id: str, data: KitchenUpdate) -> Kitchen:
        kitchen = await self.get_kitchen(kitchen_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(kitchen, field, value)
        await self.session.commit()
        return kitchen

    async def delete_kitchen(self, kitchen_id: str) -> None:
        kitchen = await self.get_kitchen(kitchen_id)
        await self.kitchens.soft_delete(kitchen)
        await self.session.commit()

    # --- Branches ---
    async def create_branch(self, data: BranchCreate) -> Branch:
        await self.get_company(data.company_id)  # mavjudligini tekshir
        branch = await self.branches.add(Branch(**data.model_dump()))
        await self.session.commit()
        return branch

    async def list_branches(
        self, limit: int, offset: int, company_id: str | None = None
    ) -> tuple[list[Branch], int]:
        if company_id:
            items = await self.branches.list_by_company(company_id, limit=limit, offset=offset)
            total = (
                await self.session.execute(
                    select(func.count())
                    .select_from(Branch)
                    .where(Branch.company_id == company_id, Branch.deleted_at.is_(None))
                )
            ).scalar_one()
            return items, total
        return await self.branches.list(limit=limit, offset=offset), await self.branches.count()

    async def get_branch(self, branch_id: str) -> Branch:
        branch = await self.branches.get(branch_id)
        if branch is None:
            raise NotFoundError("Filial topilmadi")
        return branch

    async def update_branch(self, branch_id: str, data: BranchUpdate) -> Branch:
        branch = await self.get_branch(branch_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(branch, field, value)
        await self.session.commit()
        return branch

    async def delete_branch(self, branch_id: str) -> None:
        branch = await self.get_branch(branch_id)
        await self.branches.soft_delete(branch)
        await self.session.commit()

    async def get_branch_kitchens(self, branch_id: str) -> list[Kitchen]:
        """Filialga biriktirilgan oshxonalar ro'yxati."""
        await self.get_branch(branch_id)
        return await self.kitchens.kitchens_for_branch(branch_id)

    async def assign_kitchens(self, branch_id: str, kitchen_ids: list[str]) -> list[Kitchen]:
        """Filialga oshxonalar ro'yxatini biriktiradi (eski bog'lanishlar almashtiriladi)."""
        await self.get_branch(branch_id)
        for kitchen_id in kitchen_ids:
            await self.get_kitchen(kitchen_id)  # har biri mavjudligini tekshir
        await self.session.execute(
            delete(BranchKitchen).where(BranchKitchen.branch_id == branch_id)
        )
        for kitchen_id in kitchen_ids:
            self.session.add(BranchKitchen(branch_id=branch_id, kitchen_id=kitchen_id))
        await self.session.commit()
        return await self.kitchens.kitchens_for_branch(branch_id)

    # --- Admin tasdiqlash ---
    async def list_pending_admins(self) -> list[PendingAdminRead]:
        result = await self.session.execute(
            select(User)
            .where(
                User.account_status == AccountStatus.PENDING_APPROVAL,
                User.role.in_([UserRole.KITCHEN_ADMIN, UserRole.COMPANY_ADMIN]),
            )
            .order_by(User.created_at.desc())
        )
        items: list[PendingAdminRead] = []
        for user in result.scalars().all():
            entity_name = None
            if user.role == UserRole.KITCHEN_ADMIN and user.kitchen_id:
                kitchen = await self.session.get(Kitchen, user.kitchen_id)
                entity_name = kitchen.name if kitchen else None
            elif user.role == UserRole.COMPANY_ADMIN and user.company_id:
                company = await self.session.get(Company, user.company_id)
                entity_name = company.name if company else None
            items.append(
                PendingAdminRead(
                    id=user.id,
                    full_name=user.name,
                    phone=user.phone,
                    role=user.role,
                    account_status=user.account_status,
                    entity_name=entity_name,
                    created_at=user.created_at,
                )
            )
        return items

    async def _get_pending_admin(self, user_id: str) -> User:
        user = await self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Foydalanuvchi topilmadi")
        if user.account_status != AccountStatus.PENDING_APPROVAL:
            raise ConflictError("Bu ariza tasdiqlash kutilayotgan holatda emas")
        return user

    async def approve_admin(self, user_id: str) -> User:
        user = await self._get_pending_admin(user_id)
        user.account_status = AccountStatus.APPROVED
        user.is_active = True
        if user.role == UserRole.KITCHEN_ADMIN and user.kitchen_id:
            kitchen = await self.session.get(Kitchen, user.kitchen_id)
            if kitchen:
                kitchen.is_active = True
        await notify(
            self.session, user.id, "admin_approved",
            "Hisobingiz tasdiqlandi", "Admin hisobingiz tasdiqlandi. Endi tizimga kira olasiz.",
        )
        await self.session.commit()
        return user

    async def reject_admin(self, user_id: str) -> User:
        user = await self._get_pending_admin(user_id)
        user.account_status = AccountStatus.REJECTED
        user.is_active = False
        await notify(
            self.session, user.id, "admin_approved",
            "Hisobingiz rad etildi", "Admin ro'yxatdan o'tish so'rovingiz rad etildi.",
        )
        await self.session.commit()
        return user

    # --- Foydalanuvchilarni boshqarish ---
    async def list_users(
        self,
        limit: int,
        offset: int,
        role: UserRole | None = None,
        status: AccountStatus | None = None,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        filters = [User.deleted_at.is_(None)]
        if role is not None:
            filters.append(User.role == role)
        if status is not None:
            filters.append(User.account_status == status)
        if search:
            like = f"%{search.strip()}%"
            filters.append((User.phone.ilike(like)) | (User.name.ilike(like)))
        items = (
            await self.session.execute(
                select(User)
                .where(*filters)
                .order_by(User.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        total = (
            await self.session.execute(
                select(func.count()).select_from(User).where(*filters)
            )
        ).scalar_one()
        return list(items), total

    async def get_user(self, user_id: str) -> User:
        user = await self.users.get_by_id(user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError("Foydalanuvchi topilmadi")
        return user

    async def update_user(self, user_id: str, data: UserAdminUpdate) -> User:
        user = await self.get_user(user_id)
        if user.role == UserRole.SUPER_ADMIN:
            raise ConflictError("Super admin hisobi tahrirlanmaydi")
        payload = data.model_dump(exclude_unset=True)
        # account_status va is_active mosligini saqlaymiz
        if "account_status" in payload and "is_active" not in payload:
            if payload["account_status"] == AccountStatus.INACTIVE:
                user.is_active = False
            elif payload["account_status"] == AccountStatus.APPROVED:
                user.is_active = True
        for field, value in payload.items():
            setattr(user, field, value)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ConflictError("Bu telefon raqami band") from exc
        return user

    async def delete_user(self, user_id: str) -> None:
        user = await self.get_user(user_id)
        if user.role == UserRole.SUPER_ADMIN:
            raise ConflictError("Super admin hisobi o'chirilmaydi")
        user.deleted_at = datetime.now(UTC)
        user.is_active = False
        await self.session.commit()

    # --- Buyurtmalar (butun platforma) ---
    async def list_orders(
        self,
        company_id: str | None = None,
        kitchen_id: str | None = None,
        branch_id: str | None = None,
        status: OrderStatus | None = None,
        target_date: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[OrderRead], int]:
        filters = []
        if kitchen_id:
            filters.append(Order.kitchen_id == kitchen_id)
        if branch_id:
            filters.append(Order.branch_id == branch_id)
        if status is not None:
            filters.append(Order.status == status)
        if target_date is not None:
            filters.append(Order.target_date == target_date)
        if company_id:
            filters.append(Branch.company_id == company_id)

        def _base(select_expr):
            stmt = select_expr
            if company_id:  # kompaniya bo'yicha filtr filial orqali
                stmt = stmt.join(Branch, Order.branch_id == Branch.id)
            return stmt.where(*filters)

        items = (
            await self.session.execute(
                _base(select(Order))
                .order_by(Order.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        total = (
            await self.session.execute(
                _base(select(func.count()).select_from(Order))
            )
        ).scalar_one()
        return await build_order_reads(self.session, list(items)), total

    async def get_order(self, order_id: str) -> OrderRead:
        order = await self.session.get(Order, order_id)
        if order is None:
            raise NotFoundError("Buyurtma topilmadi")
        return await build_order_read(self.session, order)

    async def update_order_status(self, order_id: str, status: OrderStatus) -> OrderRead:
        order = await self.session.get(Order, order_id)
        if order is None:
            raise NotFoundError("Buyurtma topilmadi")
        if order.status == OrderStatus.CANCELLED:
            raise ConflictError("Bekor qilingan buyurtma o'zgartirilmaydi")
        await record_order_status(self.session, order, status)
        await self.session.commit()
        return await build_order_read(self.session, order)

    async def update_branch_orders_status(
        self,
        branch_id: str,
        target_date: date,
        status: OrderStatus,
        kitchen_id: str | None = None,
    ) -> int:
        filters = [
            Order.branch_id == branch_id,
            Order.target_date == target_date,
            Order.status != status,
        ]
        if kitchen_id:
            filters.append(Order.kitchen_id == kitchen_id)
        orders = (
            await self.session.execute(select(Order).where(*filters))
        ).scalars().all()
        for order in orders:
            await record_order_status(self.session, order, status)
        await self.session.commit()
        return len(orders)

    # --- Dashboard ---
    async def dashboard(self, year: int | None = None):
        """Butun tizim bo'yicha analytics (snapshot kartalar 7 kun oldingiga nisbatan)."""
        today = today_tashkent()
        year = year or today.year
        order_where: list = []
        yp = period_year(year)
        summary = [
            await order_count_card(self.session, [], False, "orders_total", today, yp),
            await revenue_card(self.session, [], False, "revenue_total", today, yp),
            await distinct_card(
                self.session, [], True, "active_companies", User.company_id, today, yp
            ),
            await snapshot_card(
                self.session, "companies_total",
                [Company.deleted_at.is_(None)], Company.created_at, today,
            ),
            await snapshot_card(
                self.session, "active_kitchens",
                [Kitchen.deleted_at.is_(None), Kitchen.is_active.is_(True)],
                Kitchen.created_at, today,
            ),
            await snapshot_card(
                self.session, "branches_total",
                [Branch.deleted_at.is_(None)], Branch.created_at, today,
            ),
            await snapshot_card(
                self.session, "active_employees",
                [User.role == UserRole.EMPLOYEE,
                 User.account_status == AccountStatus.APPROVED],
                User.created_at, today,
            ),
            await order_card(self.session, order_where, False, "orders_today", today),
        ]
        return await build_dashboard(self.session, order_where, False, summary, year)
