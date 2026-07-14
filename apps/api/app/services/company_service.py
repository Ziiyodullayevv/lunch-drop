"""Company Admin biznes logikasi — company_id bo'yicha izolyatsiya."""

from calendar import monthrange
from datetime import UTC, date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import ConflictError, NotFoundError
from app.models.branch import Branch, EmployeeBranch
from app.models.company import Company
from app.models.enums import AccountStatus, InvoiceStatus, OrderStatus, UserRole
from app.models.invoice import Invoice, EmployeeMonthlyPayment
from app.models.kitchen import BranchKitchen, Kitchen
from app.models.order import Order
from app.models.user import User
from app.schemas.branch import BranchUpdate, CompanyBranchCreate
from app.schemas.company import CompanyUpdate
from app.schemas.company_admin import (
    BranchOrderSummary,
    EmployeeOrderSummary,
    InvoiceRead,
    InvoiceCustomerRead,
    InvoiceCustomerDetailRead,
    OrderReportResponse,
    PendingEmployeeRead,
)
from app.schemas.order import OrderRead
from app.services.dashboard import (
    build_dashboard,
    company_admin_analytics,
    order_count_card,
    period_month,
    period_week,
    revenue_card,
    snapshot_card,
    today_tashkent,
)
from app.services.order_status import record_order_status
from app.services.notification_service import notify
from app.services.order_read import build_order_read, build_order_reads

_EMPLOYEE_STATUS_MESSAGES = {
    AccountStatus.APPROVED: (
        "Hisobingiz tasdiqlandi",
        "Kompaniyaga qo'shilish so'rovingiz tasdiqlandi. Endi buyurtma bera olasiz.",
    ),
    AccountStatus.REJECTED: (
        "So'rovingiz rad etildi",
        "Kompaniyaga qo'shilish so'rovingiz rad etildi.",
    ),
    AccountStatus.INACTIVE: (
        "Hisobingiz faolsizlantirildi",
        "Hisobingiz faolsizlantirildi.",
    ),
}


class CompanyAdminService:
    def __init__(self, session: AsyncSession, company_id: str) -> None:
        self.session = session
        self.company_id = company_id

    # --- Branches (o'z kompaniyasi doirasida) ---
    async def create_branch(self, data: CompanyBranchCreate) -> Branch:
        branch = Branch(company_id=self.company_id, **data.model_dump())
        self.session.add(branch)
        await self.session.commit()
        return branch

    async def list_branches(self, limit: int, offset: int) -> tuple[list[Branch], int]:
        filters = [Branch.company_id == self.company_id, Branch.deleted_at.is_(None)]
        items = (
            (
                await self.session.execute(
                    select(Branch)
                    .where(*filters)
                    .order_by(Branch.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        total = (
            await self.session.execute(
                select(func.count()).select_from(Branch).where(*filters)
            )
        ).scalar_one()
        return list(items), total

    async def get_branch(self, branch_id: str) -> Branch:
        branch = await self.session.get(Branch, branch_id)
        if (
            branch is None
            or branch.company_id != self.company_id
            or branch.deleted_at is not None
        ):
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
        branch.deleted_at = datetime.now(UTC)
        await self.session.commit()

    # --- Oshxonalar (filialga biriktirish) ---
    async def list_available_kitchens(
        self, limit: int, offset: int
    ) -> tuple[list[Kitchen], int]:
        """Biriktirish mumkin bo'lgan faol oshxonalar (super_admin yaratgan)."""
        filters = [Kitchen.deleted_at.is_(None), Kitchen.is_active.is_(True)]
        items = (
            (
                await self.session.execute(
                    select(Kitchen)
                    .where(*filters)
                    .order_by(Kitchen.name)
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        total = (
            await self.session.execute(
                select(func.count()).select_from(Kitchen).where(*filters)
            )
        ).scalar_one()
        return list(items), total

    async def list_branch_kitchens(self, branch_id: str) -> list[Kitchen]:
        await self.get_branch(branch_id)  # tegishliligini tekshir
        rows = await self.session.execute(
            select(Kitchen)
            .join(BranchKitchen, BranchKitchen.kitchen_id == Kitchen.id)
            .where(BranchKitchen.branch_id == branch_id, Kitchen.deleted_at.is_(None))
            .order_by(Kitchen.name)
        )
        return list(rows.scalars().all())

    async def assign_kitchens(
        self, branch_id: str, kitchen_ids: list[str]
    ) -> list[Kitchen]:
        """Legacy bulk endpoint: yangi linkni bevosita emas, approval so'rovi bilan yaratadi."""
        await self.get_branch(branch_id)
        desired = set(dict.fromkeys(kitchen_ids))
        current = {
            link.kitchen_id
            for link in (
                await self.session.execute(
                    select(BranchKitchen).where(BranchKitchen.branch_id == branch_id)
                )
            )
            .scalars()
            .all()
        }
        from app.services.kitchen_connection_service import KitchenConnectionService

        connection_service = KitchenConnectionService(self.session)
        for kitchen_id in current - desired:
            await connection_service.disconnect(
                company_id=self.company_id,
                branch_id=branch_id,
                kitchen_id=kitchen_id,
            )
        for kitchen_id in desired - current:
            try:
                await connection_service.create_request(
                    company_id=self.company_id,
                    branch_id=branch_id,
                    kitchen_id=kitchen_id,
                    requested_by=None,
                )
            except ConflictError as exc:
                if "allaqachon yuborilgan" not in str(exc):
                    raise
        return await self.list_branch_kitchens(branch_id)

    # --- Company profile ---
    async def get_company(self) -> Company:
        company = await self.session.get(Company, self.company_id)
        if company is None or company.deleted_at is not None:
            raise NotFoundError("Kompaniya topilmadi")
        return company

    async def update_company(self, data: CompanyUpdate) -> Company:
        company = await self.get_company()
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(company, field, value)
        await self.session.commit()
        return company

    # --- Employees ---
    async def list_employees(
        self, status: AccountStatus | None, limit: int, offset: int
    ) -> tuple[list[User], int]:
        filters = [User.company_id == self.company_id, User.role == UserRole.EMPLOYEE]
        if status is not None:
            filters.append(User.account_status == status)
        items = (
            (
                await self.session.execute(
                    select(User)
                    .where(*filters)
                    .order_by(User.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        total = (
            await self.session.execute(
                select(func.count()).select_from(User).where(*filters)
            )
        ).scalar_one()
        return list(items), total

    async def list_pending_employees(self) -> list[PendingEmployeeRead]:
        users = (
            (
                await self.session.execute(
                    select(User)
                    .where(
                        User.company_id == self.company_id,
                        User.role == UserRole.EMPLOYEE,
                        User.account_status == AccountStatus.PENDING_APPROVAL,
                    )
                    .order_by(User.created_at.desc())
                )
            )
            .scalars()
            .all()
        )
        if not users:
            return []
        # Har bir xodimning a'zo bo'lmoqchi filiallari nomi (N+1 siz)
        rows = await self.session.execute(
            select(EmployeeBranch.user_id, Branch.name)
            .join(Branch, EmployeeBranch.branch_id == Branch.id)
            .where(EmployeeBranch.user_id.in_([u.id for u in users]))
        )
        by_user: dict[str, list[str]] = {}
        for uid, bname in rows.all():
            by_user.setdefault(uid, []).append(bname)
        return [
            PendingEmployeeRead(
                id=u.id,
                phone=u.phone,
                name=u.name,
                branches=by_user.get(u.id, []),
                account_status=u.account_status,
                created_at=u.created_at,
            )
            for u in users
        ]

    async def update_employee_status(
        self, employee_id: str, status: AccountStatus
    ) -> User:
        user = await self.session.get(User, employee_id)
        if (
            user is None
            or user.company_id != self.company_id
            or user.role != UserRole.EMPLOYEE
        ):
            raise NotFoundError("Xodim topilmadi")
        user.account_status = status
        if status == AccountStatus.INACTIVE:
            user.is_active = False
        elif status == AccountStatus.APPROVED:
            user.is_active = True
        msg = _EMPLOYEE_STATUS_MESSAGES.get(status)
        if msg:
            await notify(self.session, user.id, "account_status", msg[0], msg[1])
        await self.session.commit()
        return user

    async def bulk_confirm_orders(self) -> int:
        """Kompaniya xodimlarining bugungi yetkazilmagan buyurtmalarini DELIVERED qiladi."""
        today = datetime.now(ZoneInfo(settings.timezone)).date()
        result = await self.session.execute(
            select(Order)
            .join(User, Order.employee_id == User.id)
            .where(
                User.company_id == self.company_id,
                Order.target_date == today,
                Order.status.in_(
                    [OrderStatus.CREATED, OrderStatus.PREPARING, OrderStatus.ON_THE_WAY]
                ),
            )
        )
        orders = result.scalars().all()
        for order in orders:
            await record_order_status(self.session, order, OrderStatus.DELIVERED)
        await self.session.commit()
        return len(orders)

    async def bulk_confirm_branch_orders(
        self,
        branch_id: str,
        target_date: date | None = None,
        period_start: date | None = None,
        period_end: date | None = None,
    ) -> int:
        """Bitta filialning yetkazilmagan buyurtmalarini bir martada tasdiqlaydi."""
        branch = await self.session.scalar(
            select(Branch).where(
                Branch.id == branch_id,
                Branch.company_id == self.company_id,
                Branch.deleted_at.is_(None),
            )
        )
        if branch is None:
            raise NotFoundError("Filial topilmadi")
        if target_date:
            date_filters = (Order.target_date == target_date,)
        elif period_start or period_end:
            date_filters = tuple(
                condition
                for condition in (
                    Order.target_date >= period_start if period_start else None,
                    Order.target_date <= period_end if period_end else None,
                )
                if condition is not None
            )
        else:
            date_filters = (
                Order.target_date == datetime.now(ZoneInfo(settings.timezone)).date(),
            )
        orders = (
            await self.session.execute(
                select(Order)
                .join(User, Order.employee_id == User.id)
                .where(
                    Order.branch_id == branch_id,
                    User.company_id == self.company_id,
                    *date_filters,
                    Order.status.in_((OrderStatus.CREATED, OrderStatus.PREPARING, OrderStatus.ON_THE_WAY)),
                )
            )
        ).scalars().all()
        for order in orders:
            await record_order_status(self.session, order, OrderStatus.DELIVERED)
        await self.session.commit()
        return len(orders)

    async def order_report(self, period_start, period_end) -> OrderReportResponse:
        base = [
            User.company_id == self.company_id,
            Order.target_date.between(period_start, period_end),
        ]
        branch_rows = (
            await self.session.execute(
                select(
                    Branch.id, Branch.name,
                    func.count(Order.id),
                    func.coalesce(func.sum(Order.historical_price), 0),
                    func.sum(case((Order.status.in_((OrderStatus.CREATED, OrderStatus.PREPARING, OrderStatus.ON_THE_WAY)), 1), else_=0)),
                )
                .join(Order, Order.branch_id == Branch.id)
                .join(User, Order.employee_id == User.id)
                .where(Branch.company_id == self.company_id, *base)
                .group_by(Branch.id, Branch.name)
                .order_by(Branch.name)
            )
        ).all()
        employee_rows = (
            await self.session.execute(
                select(
                    User.id, User.name, Branch.id, Branch.name,
                    func.count(Order.id),
                    func.coalesce(func.sum(Order.historical_price), 0),
                    func.sum(case((Order.status == OrderStatus.DELIVERED, 1), else_=0)),
                )
                .join(Order, Order.employee_id == User.id)
                .join(Branch, Order.branch_id == Branch.id)
                .where(*base)
                .group_by(User.id, User.name, Branch.id, Branch.name)
                .order_by(Branch.name, User.name)
            )
        ).all()
        total_orders = sum(int(row[2]) for row in branch_rows)
        total_amount = sum((row[3] for row in branch_rows), Decimal("0"))
        return OrderReportResponse(
            period_start=period_start,
            period_end=period_end,
            branches=[BranchOrderSummary(branch_id=r[0], branch_name=r[1], order_count=r[2], total_amount=r[3], pending_count=r[4] or 0) for r in branch_rows],
            employees=[EmployeeOrderSummary(employee_id=r[0], employee_name=r[1], branch_id=r[2], branch_name=r[3], order_count=r[4], total_amount=r[5], delivered_count=r[6] or 0) for r in employee_rows],
            total_orders=total_orders,
            total_amount=total_amount,
        )

    async def list_orders(
        self,
        target_date=None,
        status: OrderStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[OrderRead], int]:
        """Kompaniya xodimlarining buyurtmalari (company_id bo'yicha izolyatsiya)."""
        filters = [User.company_id == self.company_id]
        if target_date is not None:
            filters.append(Order.target_date == target_date)
        if status is not None:
            filters.append(Order.status == status)
        items = (
            (
                await self.session.execute(
                    select(Order)
                    .join(User, Order.employee_id == User.id)
                    .where(*filters)
                    .order_by(Order.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        total = (
            await self.session.execute(
                select(func.count())
                .select_from(Order)
                .join(User, Order.employee_id == User.id)
                .where(*filters)
            )
        ).scalar_one()
        return await build_order_reads(self.session, list(items)), total

    async def get_order(self, order_id: str) -> OrderRead:
        """Bitta buyurtma detali — buyurtmachi shu kompaniyaga tegishli bo'lsa."""
        order = await self.session.get(Order, order_id)
        if order is None:
            raise NotFoundError("Buyurtma topilmadi")
        employee = await self.session.get(User, order.employee_id)
        if employee is None or employee.company_id != self.company_id:
            raise NotFoundError("Buyurtma topilmadi")
        return await build_order_read(self.session, order)

    async def list_invoices(self) -> list[InvoiceRead]:
        result = await self.session.execute(
            select(Invoice)
            .where(Invoice.company_id == self.company_id)
            .order_by(Invoice.created_at.desc())
        )
        invoices = list(result.scalars().all())
        output = []
        branch_names = {b.id: b.name for b in (await self.session.scalars(select(Branch).where(Branch.company_id == self.company_id))).all()}
        employee_names = {u.id: u.name for u in (await self.session.scalars(select(User).where(User.company_id == self.company_id))).all()}
        for invoice in invoices:
            # Relationship is selectin-loaded; names are resolved in one small query.
            output.append(InvoiceRead(
                id=invoice.id, company_id=invoice.company_id, period_start=invoice.period_start,
                period_end=invoice.period_end, total_company_expense=invoice.total_company_expense,
                total_system_fee=invoice.total_system_fee, total_kitchen_profit=invoice.total_kitchen_profit,
                status=invoice.status, created_at=invoice.created_at,
                branch_summaries=[BranchOrderSummary(branch_id=x.branch_id, branch_name=branch_names.get(x.branch_id, "—"), order_count=x.order_count, total_amount=x.total_amount, pending_count=0) for x in invoice.branch_summaries],
                employee_summaries=[EmployeeOrderSummary(employee_id=x.employee_id, employee_name=employee_names.get(x.employee_id), branch_id=x.branch_id, branch_name=branch_names.get(x.branch_id, "—"), order_count=x.order_count, total_amount=x.total_amount, delivered_count=x.order_count) for x in invoice.employee_summaries],
            ))
        return output

    async def list_invoice_customers(self, month: date) -> list[InvoiceCustomerRead]:
        """Barcha faol xodimlarning tanlangan oydagi buyurtma summasi."""
        period_month = month.replace(day=1)
        period_end = period_month.replace(
            day=monthrange(period_month.year, period_month.month)[1]
        )
        employees = list(
            (
                await self.session.execute(
                    select(User)
                    .where(
                        User.company_id == self.company_id,
                        User.role == UserRole.EMPLOYEE,
                        User.deleted_at.is_(None),
                        User.is_active.is_(True),
                        User.account_status == AccountStatus.APPROVED,
                    )
                    .order_by(User.name.asc().nulls_last(), User.created_at.asc())
                )
            ).scalars().all()
        )
        if not employees:
            return []

        employee_ids = [employee.id for employee in employees]
        order_rows = (
            await self.session.execute(
                select(
                    Order.employee_id,
                    func.count(Order.id),
                    func.coalesce(func.sum(Order.historical_price), 0),
                )
                .where(
                    Order.employee_id.in_(employee_ids),
                    Order.target_date.between(period_month, period_end),
                    Order.status != OrderStatus.CANCELLED,
                )
                .group_by(Order.employee_id)
            )
        ).all()
        totals = {
            employee_id: (order_count, total_amount)
            for employee_id, order_count, total_amount in order_rows
        }

        branch_rows = (
            await self.session.execute(
                select(EmployeeBranch.user_id, Branch.name)
                .join(Branch, Branch.id == EmployeeBranch.branch_id)
                .where(
                    EmployeeBranch.user_id.in_(employee_ids),
                    Branch.company_id == self.company_id,
                    Branch.deleted_at.is_(None),
                )
                .order_by(Branch.name)
            )
        ).all()
        branches: dict[str, list[str]] = {}
        for employee_id, branch_name in branch_rows:
            branches.setdefault(employee_id, []).append(branch_name)

        payments = list(
            (
                await self.session.execute(
                    select(EmployeeMonthlyPayment).where(
                        EmployeeMonthlyPayment.company_id == self.company_id,
                        EmployeeMonthlyPayment.period_month == period_month,
                        EmployeeMonthlyPayment.employee_id.in_(employee_ids),
                    )
                )
            ).scalars().all()
        )
        payment_statuses = {payment.employee_id: payment.status for payment in payments}
        company = await self.get_company()

        return [
            InvoiceCustomerRead(
                company_id=self.company_id,
                company_name=company.name,
                employee_id=employee.id,
                employee_name=employee.name,
                employee_phone=employee.phone,
                employee_avatar_url=employee.avatar_url,
                branch_names=branches.get(employee.id, []),
                period_month=period_month,
                order_count=totals.get(employee.id, (0, Decimal("0")))[0],
                total_amount=totals.get(employee.id, (0, Decimal("0")))[1],
                status=payment_statuses.get(employee.id, InvoiceStatus.PENDING),
            )
            for employee in employees
        ]

    async def update_invoice_customer_status(
        self,
        employee_id: str,
        month: date,
        status: InvoiceStatus,
    ) -> InvoiceCustomerRead:
        period_month = month.replace(day=1)
        employee = await self.session.scalar(
            select(User).where(
                User.id == employee_id,
                User.company_id == self.company_id,
                User.role == UserRole.EMPLOYEE,
                User.deleted_at.is_(None),
            )
        )
        if employee is None:
            raise NotFoundError("Xodim topilmadi")

        payment = await self.session.scalar(
            select(EmployeeMonthlyPayment).where(
                EmployeeMonthlyPayment.company_id == self.company_id,
                EmployeeMonthlyPayment.employee_id == employee_id,
                EmployeeMonthlyPayment.period_month == period_month,
            )
        )
        if payment is None:
            payment = EmployeeMonthlyPayment(
                company_id=self.company_id,
                employee_id=employee_id,
                period_month=period_month,
                status=status,
            )
            self.session.add(payment)
        else:
            payment.status = status
        await self.session.commit()

        customers = await self.list_invoice_customers(period_month)
        customer = next((item for item in customers if item.employee_id == employee_id), None)
        if customer is None:
            raise NotFoundError("Xodim topilmadi")
        return customer

    async def get_invoice_customer(
        self, employee_id: str, month: date
    ) -> InvoiceCustomerDetailRead:
        period_month = month.replace(day=1)
        period_end = period_month.replace(
            day=monthrange(period_month.year, period_month.month)[1]
        )
        customers = await self.list_invoice_customers(period_month)
        customer = next((item for item in customers if item.employee_id == employee_id), None)
        if customer is None:
            raise NotFoundError("Xodim topilmadi")

        orders = list(
            (
                await self.session.execute(
                    select(Order)
                    .where(
                        Order.employee_id == employee_id,
                        Order.target_date.between(period_month, period_end),
                        Order.status != OrderStatus.CANCELLED,
                    )
                    .order_by(Order.target_date.desc(), Order.created_at.desc())
                )
            ).scalars().all()
        )
        return InvoiceCustomerDetailRead(
            **customer.model_dump(),
            orders=await build_order_reads(self.session, orders),
        )

    async def dashboard(self, year: int | None = None):
        """Kompaniya bo'yicha analytics (faqat o'z company_id va filiallari)."""
        today = today_tashkent()
        year = year or today.year
        order_where = [User.company_id == self.company_id]
        summary = [
            await revenue_card(
                self.session,
                order_where,
                True,
                "monthly_cost",
                today,
                period_month(today),
            ),
            await snapshot_card(
                self.session,
                "active_employees",
                [
                    User.company_id == self.company_id,
                    User.role == UserRole.EMPLOYEE,
                    User.account_status == AccountStatus.APPROVED,
                ],
                User.created_at,
                today,
            ),
            await snapshot_card(
                self.session,
                "branches_total",
                [Branch.company_id == self.company_id, Branch.deleted_at.is_(None)],
                Branch.created_at,
                today,
            ),
            await order_count_card(
                self.session,
                order_where,
                True,
                "weekly_delivered_orders",
                today,
                period_week(today),
                OrderStatus.DELIVERED,
            ),
        ]
        return await build_dashboard(
            self.session,
            order_where,
            True,
            summary,
            year,
            company_admin_analytics_data=await company_admin_analytics(
                self.session, self.company_id, today, year
            ),
        )
