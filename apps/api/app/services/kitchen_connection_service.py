import asyncio
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.branch import Branch
from app.models.company import Company
from app.models.enums import ConnectionRequestStatus, OrderStatus
from app.models.kitchen import BranchKitchen, Kitchen
from app.models.kitchen_connection import KitchenConnectionRequest
from app.models.order import Order
from app.schemas.kitchen_connection import KitchenConnectionRead, KitchenPartnerReport


class KitchenConnectionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _read(self, request: KitchenConnectionRequest) -> KitchenConnectionRead:
        company = await self.session.get(Company, request.company_id)
        branch = await self.session.get(Branch, request.branch_id)
        kitchen = await self.session.get(Kitchen, request.kitchen_id)
        return KitchenConnectionRead(
            id=request.id,
            company_id=request.company_id,
            company_name=company.name if company else "—",
            branch_id=request.branch_id,
            branch_name=branch.name if branch else "—",
            kitchen_id=request.kitchen_id,
            kitchen_name=kitchen.name if kitchen else "—",
            status=request.status,
            created_at=request.created_at,
            reviewed_at=request.reviewed_at,
        )

    async def create_request(
        self,
        *,
        company_id: str,
        branch_id: str,
        kitchen_id: str,
        requested_by: str | None,
    ) -> KitchenConnectionRead:
        branch = await self.session.get(Branch, branch_id)
        if (
            branch is None
            or branch.company_id != company_id
            or branch.deleted_at is not None
        ):
            raise NotFoundError("Filial topilmadi")
        kitchen = await self.session.get(Kitchen, kitchen_id)
        if kitchen is None or kitchen.deleted_at is not None or not kitchen.is_active:
            raise NotFoundError("Oshxona topilmadi yoki faol emas")
        link = (
            await self.session.execute(
                select(BranchKitchen).where(
                    BranchKitchen.branch_id == branch_id,
                    BranchKitchen.kitchen_id == kitchen_id,
                )
            )
        ).scalar_one_or_none()
        if link:
            raise ConflictError("Filial bu oshxonaga allaqachon ulangan")
        pending = (
            await self.session.execute(
                select(KitchenConnectionRequest).where(
                    KitchenConnectionRequest.branch_id == branch_id,
                    KitchenConnectionRequest.kitchen_id == kitchen_id,
                    KitchenConnectionRequest.status == ConnectionRequestStatus.PENDING,
                )
            )
        ).scalar_one_or_none()
        if pending:
            raise ConflictError("Bu oshxonaga ulanish so'rovi allaqachon yuborilgan")
        request = KitchenConnectionRequest(
            company_id=company_id,
            branch_id=branch_id,
            kitchen_id=kitchen_id,
            requested_by_user_id=requested_by,
            status=ConnectionRequestStatus.PENDING,
        )
        self.session.add(request)
        await self.session.commit()
        await self.session.refresh(request)
        from bot.notifier import send_kitchen_connection_notification

        asyncio.create_task(send_kitchen_connection_notification(request.id))
        return await self._read(request)

    async def list_company_requests(
        self, company_id: str, status: ConnectionRequestStatus | None = None
    ) -> list[KitchenConnectionRead]:
        stmt = select(KitchenConnectionRequest).where(
            KitchenConnectionRequest.company_id == company_id
        )
        if status:
            stmt = stmt.where(KitchenConnectionRequest.status == status)
        requests = (
            (
                await self.session.execute(
                    stmt.order_by(KitchenConnectionRequest.created_at.desc())
                )
            )
            .scalars()
            .all()
        )
        return [await self._read(request) for request in requests]

    async def list_kitchen_requests(
        self, kitchen_id: str, status: ConnectionRequestStatus | None = None
    ) -> list[KitchenConnectionRead]:
        stmt = select(KitchenConnectionRequest).where(
            KitchenConnectionRequest.kitchen_id == kitchen_id
        )
        if status:
            stmt = stmt.where(KitchenConnectionRequest.status == status)
        requests = (
            (
                await self.session.execute(
                    stmt.order_by(KitchenConnectionRequest.created_at.desc())
                )
            )
            .scalars()
            .all()
        )
        return [await self._read(request) for request in requests]

    async def cancel_request(
        self, *, request_id: str, company_id: str
    ) -> KitchenConnectionRead:
        request = await self.session.get(KitchenConnectionRequest, request_id)
        if request is None or request.company_id != company_id:
            raise NotFoundError("Ulanish so'rovi topilmadi")
        if request.status != ConnectionRequestStatus.PENDING:
            raise ConflictError("Faqat kutilayotgan so'rovni bekor qilish mumkin")
        request.status = ConnectionRequestStatus.CANCELLED
        request.reviewed_at = datetime.now(UTC)
        await self.session.commit()
        return await self._read(request)

    async def disconnect(
        self, *, company_id: str, branch_id: str, kitchen_id: str
    ) -> None:
        branch = await self.session.get(Branch, branch_id)
        if branch is None or branch.company_id != company_id:
            raise NotFoundError("Filial topilmadi")
        result = await self.session.execute(
            delete(BranchKitchen).where(
                BranchKitchen.branch_id == branch_id,
                BranchKitchen.kitchen_id == kitchen_id,
            )
        )
        if not result.rowcount:
            raise NotFoundError("Faol ulanish topilmadi")
        approved = (
            (
                await self.session.execute(
                    select(KitchenConnectionRequest)
                    .where(
                        KitchenConnectionRequest.branch_id == branch_id,
                        KitchenConnectionRequest.kitchen_id == kitchen_id,
                        KitchenConnectionRequest.status
                        == ConnectionRequestStatus.APPROVED,
                    )
                    .order_by(KitchenConnectionRequest.created_at.desc())
                )
            )
            .scalars()
            .first()
        )
        if approved:
            approved.status = ConnectionRequestStatus.CANCELLED
            approved.reviewed_at = datetime.now(UTC)
        await self.session.commit()

    async def review(
        self,
        *,
        request_id: str,
        kitchen_id: str,
        reviewer_id: str,
        approve: bool,
    ) -> KitchenConnectionRead:
        request = (
            await self.session.execute(
                select(KitchenConnectionRequest)
                .where(KitchenConnectionRequest.id == request_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if request is None or request.kitchen_id != kitchen_id:
            raise NotFoundError("Ulanish so'rovi topilmadi")
        if request.status != ConnectionRequestStatus.PENDING:
            raise ConflictError("So'rov allaqachon ko'rib chiqilgan")
        request.status = (
            ConnectionRequestStatus.APPROVED
            if approve
            else ConnectionRequestStatus.REJECTED
        )
        request.reviewed_by_user_id = reviewer_id
        request.reviewed_at = datetime.now(UTC)
        if approve:
            link = (
                await self.session.execute(
                    select(BranchKitchen).where(
                        BranchKitchen.branch_id == request.branch_id,
                        BranchKitchen.kitchen_id == request.kitchen_id,
                    )
                )
            ).scalar_one_or_none()
            if link is None:
                self.session.add(
                    BranchKitchen(
                        branch_id=request.branch_id, kitchen_id=request.kitchen_id
                    )
                )
        await self.session.commit()
        return await self._read(request)

    async def partner_report(
        self, *, kitchen_id: str, month_start: date, month_end: date
    ) -> list[KitchenPartnerReport]:
        links = (
            await self.session.execute(
                select(BranchKitchen, Branch, Company)
                .join(Branch, Branch.id == BranchKitchen.branch_id)
                .join(Company, Company.id == Branch.company_id)
                .where(
                    BranchKitchen.kitchen_id == kitchen_id,
                    Branch.deleted_at.is_(None),
                    Company.deleted_at.is_(None),
                )
                .order_by(Company.name, Branch.name)
            )
        ).all()
        totals = {
            branch_id: (count, gross or Decimal("0"), fee or Decimal("0"))
            for branch_id, count, gross, fee in (
                await self.session.execute(
                    select(
                        Order.branch_id,
                        func.count(Order.id),
                        func.sum(Order.historical_price),
                        func.sum(Order.system_fee),
                    )
                    .where(
                        Order.kitchen_id == kitchen_id,
                        Order.status == OrderStatus.DELIVERED,
                        Order.target_date >= month_start,
                        Order.target_date < month_end,
                    )
                    .group_by(Order.branch_id)
                )
            ).all()
        }
        result = []
        for _link, branch, company in links:
            count, gross, fee = totals.get(branch.id, (0, Decimal("0"), Decimal("0")))
            result.append(
                KitchenPartnerReport(
                    company_id=company.id,
                    company_name=company.name,
                    branch_id=branch.id,
                    branch_name=branch.name,
                    billing_day=company.billing_day,
                    orders_count=count,
                    gross_amount=gross,
                    system_fee=fee,
                    kitchen_receivable=gross - fee,
                )
            )
        return result
