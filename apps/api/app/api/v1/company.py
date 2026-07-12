"""Company Admin API (TZ 4.4) — xodimlar, bulk-confirm, invoices."""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.dependencies import require_company_admin
from app.models.enums import AccountStatus, ConnectionRequestStatus, OrderStatus
from app.models.user import User
from app.schemas.auth import UserRead
from app.schemas.branch import BranchRead, BranchUpdate, CompanyBranchCreate
from app.schemas.common import Page
from app.schemas.company import CompanyRead, CompanyUpdate
from app.schemas.dashboard import DashboardResponse
from app.schemas.company_admin import (
    OrderReportResponse,
    BulkConfirmResponse,
    EmployeeStatusUpdate,
    InvoiceRead,
    PendingEmployeeRead,
)
from app.schemas.kitchen import AssignKitchensRequest, KitchenRead
from app.schemas.kitchen_connection import (
    KitchenConnectionCreate,
    KitchenConnectionRead,
)
from app.schemas.order import OrderRead
from app.services.company_service import CompanyAdminService
from app.services.kitchen_connection_service import KitchenConnectionService

router = APIRouter(prefix="/api/v1/company", tags=["company-admin"])


def _connections(
    session: AsyncSession = Depends(get_session),
) -> KitchenConnectionService:
    return KitchenConnectionService(session)


def _svc(
    current_user: User = Depends(require_company_admin),
    session: AsyncSession = Depends(get_session),
) -> CompanyAdminService:
    return CompanyAdminService(session, current_user.company_id)


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="Kompaniya statistikasi (analytics)",
)
async def dashboard(
    year: int | None = Query(None, description="Oylik chart yili (default: joriy yil)"),
    svc: CompanyAdminService = Depends(_svc),
) -> DashboardResponse:
    return await svc.dashboard(year)


# --- Company profile ---
@router.get("/me", response_model=CompanyRead, summary="O'z kompaniya ma'lumotlari")
async def get_company(svc: CompanyAdminService = Depends(_svc)) -> CompanyRead:
    return await svc.get_company()


@router.patch(
    "/branches/{branch_id}/orders/bulk-confirm",
    response_model=BulkConfirmResponse,
    summary="Bitta filial buyurtmalarini ommaviy tasdiqlash",
)
async def bulk_confirm_branch(
    branch_id: str,
    target_date: date | None = Query(None),
    svc: CompanyAdminService = Depends(_svc),
) -> BulkConfirmResponse:
    return BulkConfirmResponse(confirmed=await svc.bulk_confirm_branch_orders(branch_id, target_date))


@router.get("/reports/orders", response_model=OrderReportResponse, summary="Filial va xodimlar buyurtma hisoboti")
async def order_report(
    period_start: date,
    period_end: date,
    svc: CompanyAdminService = Depends(_svc),
) -> OrderReportResponse:
    if period_end < period_start:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="period_end period_start dan oldin bo'lishi mumkin emas")
    return await svc.order_report(period_start, period_end)


@router.patch(
    "/me", response_model=CompanyRead, summary="Kompaniya ma'lumotlarini yangilash"
)
async def update_company(
    body: CompanyUpdate, svc: CompanyAdminService = Depends(_svc)
) -> CompanyRead:
    return await svc.update_company(body)


# --- Branches (o'z kompaniyasi) ---
@router.get("/branches", response_model=Page[BranchRead], summary="Filiallar ro'yxati")
async def list_branches(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: CompanyAdminService = Depends(_svc),
) -> Page[BranchRead]:
    items, total = await svc.list_branches(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/branches",
    response_model=BranchRead,
    status_code=status.HTTP_201_CREATED,
    summary="Filial qo'shish",
)
async def create_branch(
    body: CompanyBranchCreate, svc: CompanyAdminService = Depends(_svc)
) -> BranchRead:
    return await svc.create_branch(body)


@router.get("/branches/{branch_id}", response_model=BranchRead, summary="Filial")
async def get_branch(
    branch_id: str, svc: CompanyAdminService = Depends(_svc)
) -> BranchRead:
    return await svc.get_branch(branch_id)


@router.patch(
    "/branches/{branch_id}", response_model=BranchRead, summary="Filialni yangilash"
)
async def update_branch(
    branch_id: str, body: BranchUpdate, svc: CompanyAdminService = Depends(_svc)
) -> BranchRead:
    return await svc.update_branch(branch_id, body)


@router.delete(
    "/branches/{branch_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Filialni o'chirish (soft)",
)
async def delete_branch(
    branch_id: str, svc: CompanyAdminService = Depends(_svc)
) -> None:
    await svc.delete_branch(branch_id)


# --- Oshxonalar (filialga biriktirish) ---
@router.get(
    "/kitchens",
    response_model=Page[KitchenRead],
    summary="Biriktirish mumkin bo'lgan oshxonalar",
)
async def available_kitchens(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: CompanyAdminService = Depends(_svc),
) -> Page[KitchenRead]:
    items, total = await svc.list_available_kitchens(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/branches/{branch_id}/kitchens",
    response_model=list[KitchenRead],
    summary="Filialga biriktirilgan oshxonalar",
)
async def branch_kitchens(
    branch_id: str, svc: CompanyAdminService = Depends(_svc)
) -> list[KitchenRead]:
    return await svc.list_branch_kitchens(branch_id)


@router.post(
    "/branches/{branch_id}/assign-kitchens",
    response_model=list[KitchenRead],
    summary="Filialga oshxonalarni biriktirish (eski ro'yxat almashtiriladi)",
)
async def assign_kitchens(
    branch_id: str,
    body: AssignKitchensRequest,
    svc: CompanyAdminService = Depends(_svc),
) -> list[KitchenRead]:
    return await svc.assign_kitchens(branch_id, body.kitchen_ids)


@router.get(
    "/kitchen-connections",
    response_model=list[KitchenConnectionRead],
    summary="Oshxona ulanish so'rovlari va holatlari",
)
async def kitchen_connections(
    connection_status: ConnectionRequestStatus | None = Query(None, alias="status"),
    current_user: User = Depends(require_company_admin),
    svc: KitchenConnectionService = Depends(_connections),
) -> list[KitchenConnectionRead]:
    return await svc.list_company_requests(current_user.company_id, connection_status)


@router.post(
    "/branches/{branch_id}/kitchen-requests",
    response_model=KitchenConnectionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Filialni oshxonaga ulash so'rovini yuborish",
)
async def request_kitchen_connection(
    branch_id: str,
    body: KitchenConnectionCreate,
    current_user: User = Depends(require_company_admin),
    svc: KitchenConnectionService = Depends(_connections),
) -> KitchenConnectionRead:
    return await svc.create_request(
        company_id=current_user.company_id,
        branch_id=branch_id,
        kitchen_id=body.kitchen_id,
        requested_by=current_user.id,
    )


@router.delete(
    "/kitchen-requests/{request_id}",
    response_model=KitchenConnectionRead,
    summary="Kutilayotgan ulanish so'rovini bekor qilish",
)
async def cancel_kitchen_request(
    request_id: str,
    current_user: User = Depends(require_company_admin),
    svc: KitchenConnectionService = Depends(_connections),
) -> KitchenConnectionRead:
    return await svc.cancel_request(
        request_id=request_id, company_id=current_user.company_id
    )


@router.delete(
    "/branches/{branch_id}/kitchens/{kitchen_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Tasdiqlangan oshxona ulanishini uzish",
)
async def disconnect_kitchen(
    branch_id: str,
    kitchen_id: str,
    current_user: User = Depends(require_company_admin),
    svc: KitchenConnectionService = Depends(_connections),
) -> None:
    await svc.disconnect(
        company_id=current_user.company_id,
        branch_id=branch_id,
        kitchen_id=kitchen_id,
    )


# --- Employees ---
@router.get(
    "/employees",
    response_model=Page[UserRead],
    summary="Barcha xodimlar (status bo'yicha filtr)",
)
async def list_employees(
    account_status: AccountStatus | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: CompanyAdminService = Depends(_svc),
) -> Page[UserRead]:
    items, total = await svc.list_employees(account_status, limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/employees/pending",
    response_model=list[PendingEmployeeRead],
    summary="Qo'shilishni kutayotgan xodimlar",
)
async def pending_employees(
    svc: CompanyAdminService = Depends(_svc),
) -> list[PendingEmployeeRead]:
    return await svc.list_pending_employees()


@router.patch(
    "/employees/{employee_id}/status",
    response_model=UserRead,
    summary="Xodim holatini o'zgartirish (APPROVED/REJECTED/INACTIVE)",
)
async def update_employee_status(
    employee_id: str,
    body: EmployeeStatusUpdate,
    svc: CompanyAdminService = Depends(_svc),
) -> UserRead:
    return await svc.update_employee_status(employee_id, body.status)


@router.get("/orders", response_model=Page[OrderRead], summary="Kompaniya buyurtmalari")
async def list_orders(
    target_date: date | None = Query(None),
    order_status: OrderStatus | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: CompanyAdminService = Depends(_svc),
) -> Page[OrderRead]:
    items, total = await svc.list_orders(target_date, order_status, limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/orders/{order_id}", response_model=OrderRead, summary="Buyurtma tafsilotlari"
)
async def get_order(
    order_id: str, svc: CompanyAdminService = Depends(_svc)
) -> OrderRead:
    return await svc.get_order(order_id)


@router.patch(
    "/orders/bulk-confirm",
    response_model=BulkConfirmResponse,
    summary="Bugungi buyurtmalarni ommaviy DELIVERED qilish",
)
async def bulk_confirm(svc: CompanyAdminService = Depends(_svc)) -> BulkConfirmResponse:
    return BulkConfirmResponse(confirmed=await svc.bulk_confirm_orders())


@router.get("/invoices", response_model=list[InvoiceRead], summary="Hisob-fakturalar")
async def invoices(svc: CompanyAdminService = Depends(_svc)) -> list[InvoiceRead]:
    return await svc.list_invoices()
