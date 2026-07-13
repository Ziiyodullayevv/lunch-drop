"""Super Admin API (TZ 4.2) — companies/kitchens/branches CRUD, assign, admin, dashboard."""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.dependencies import require_super_admin
from app.models.enums import AccountStatus, OrderStatus, UserRole
from app.schemas.auth import PendingAdminRead, UserRead
from app.schemas.branch import BranchCreate, BranchRead, BranchUpdate
from app.schemas.common import Page
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate
from app.schemas.dashboard import DashboardResponse
from app.schemas.kitchen import (
    AssignKitchensRequest,
    KitchenCreate,
    KitchenRead,
    KitchenUpdate,
)
from app.schemas.order import (
    BranchOrderStatusUpdate,
    BulkOrderStatusResponse,
    OrderRead,
    OrderStatusUpdate,
)
from app.schemas.company_admin import (
    InvoiceCustomerRead,
    InvoiceCustomerDetailRead,
    InvoiceCustomerStatusUpdate,
)
from app.schemas.user_admin import UserAdminRead, UserAdminUpdate
from app.services.super_admin_service import SuperAdminService

router = APIRouter(
    prefix="/api/v1/super-admin",
    tags=["super-admin"],
    dependencies=[Depends(require_super_admin)],
)


def _svc(session: AsyncSession = Depends(get_session)) -> SuperAdminService:
    return SuperAdminService(session)


@router.get(
    "/invoice-customers",
    response_model=list[InvoiceCustomerRead],
    summary="Barcha kompaniyalarning oylik xodim hisoblari",
)
async def invoice_customers(
    month: date = Query(...),
    company_id: str | None = Query(None),
    svc: SuperAdminService = Depends(_svc),
) -> list[InvoiceCustomerRead]:
    return await svc.list_invoice_customers(month, company_id)


@router.get(
    "/invoice-customers/{employee_id}",
    response_model=InvoiceCustomerDetailRead,
)
async def invoice_customer_detail(
    employee_id: str,
    month: date = Query(...),
    svc: SuperAdminService = Depends(_svc),
) -> InvoiceCustomerDetailRead:
    return await svc.get_invoice_customer(employee_id, month)


@router.patch(
    "/invoice-customers/{employee_id}/status",
    response_model=InvoiceCustomerRead,
)
async def update_invoice_customer_status(
    employee_id: str,
    body: InvoiceCustomerStatusUpdate,
    month: date = Query(...),
    svc: SuperAdminService = Depends(_svc),
) -> InvoiceCustomerRead:
    return await svc.update_invoice_customer_status(employee_id, month, body.status)


# --- Dashboard ---
@router.get("/dashboard", response_model=DashboardResponse, summary="Statistikalar (analytics)")
async def dashboard(
    year: int | None = Query(None, description="Oylik chart yili (default: joriy yil)"),
    svc: SuperAdminService = Depends(_svc),
) -> DashboardResponse:
    return await svc.dashboard(year)


# --- Companies ---
@router.get("/companies", response_model=Page[CompanyRead], summary="Kompaniyalar")
async def list_companies(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: SuperAdminService = Depends(_svc),
) -> Page[CompanyRead]:
    items, total = await svc.list_companies(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/companies", response_model=CompanyRead, status_code=status.HTTP_201_CREATED,
    summary="Kompaniya yaratish",
)
async def create_company(
    body: CompanyCreate, svc: SuperAdminService = Depends(_svc)
) -> CompanyRead:
    return await svc.create_company(body)


@router.get("/companies/{company_id}", response_model=CompanyRead, summary="Kompaniya")
async def get_company(
    company_id: str, svc: SuperAdminService = Depends(_svc)
) -> CompanyRead:
    return await svc.get_company(company_id)


@router.patch("/companies/{company_id}", response_model=CompanyRead, summary="Yangilash")
async def update_company(
    company_id: str, body: CompanyUpdate, svc: SuperAdminService = Depends(_svc)
) -> CompanyRead:
    return await svc.update_company(company_id, body)


@router.delete(
    "/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT, summary="O'chirish"
)
async def delete_company(company_id: str, svc: SuperAdminService = Depends(_svc)) -> None:
    await svc.delete_company(company_id)


# --- Kitchens ---
@router.get("/kitchens", response_model=Page[KitchenRead], summary="Oshxonalar")
async def list_kitchens(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: SuperAdminService = Depends(_svc),
) -> Page[KitchenRead]:
    items, total = await svc.list_kitchens(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/kitchens", response_model=KitchenRead, status_code=status.HTTP_201_CREATED,
    summary="Oshxona yaratish",
)
async def create_kitchen(
    body: KitchenCreate, svc: SuperAdminService = Depends(_svc)
) -> KitchenRead:
    return await svc.create_kitchen(body)


@router.get("/kitchens/{kitchen_id}", response_model=KitchenRead, summary="Oshxona")
async def get_kitchen(
    kitchen_id: str, svc: SuperAdminService = Depends(_svc)
) -> KitchenRead:
    return await svc.get_kitchen(kitchen_id)


@router.patch("/kitchens/{kitchen_id}", response_model=KitchenRead, summary="Yangilash")
async def update_kitchen(
    kitchen_id: str, body: KitchenUpdate, svc: SuperAdminService = Depends(_svc)
) -> KitchenRead:
    return await svc.update_kitchen(kitchen_id, body)


@router.delete(
    "/kitchens/{kitchen_id}", status_code=status.HTTP_204_NO_CONTENT, summary="O'chirish"
)
async def delete_kitchen(kitchen_id: str, svc: SuperAdminService = Depends(_svc)) -> None:
    await svc.delete_kitchen(kitchen_id)


# --- Branches ---
@router.get("/branches", response_model=Page[BranchRead], summary="Filiallar")
async def list_branches(
    company_id: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: SuperAdminService = Depends(_svc),
) -> Page[BranchRead]:
    items, total = await svc.list_branches(limit, offset, company_id)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/branches", response_model=BranchRead, status_code=status.HTTP_201_CREATED,
    summary="Filial yaratish",
)
async def create_branch(
    body: BranchCreate, svc: SuperAdminService = Depends(_svc)
) -> BranchRead:
    return await svc.create_branch(body)


@router.get("/branches/{branch_id}", response_model=BranchRead, summary="Filial")
async def get_branch(branch_id: str, svc: SuperAdminService = Depends(_svc)) -> BranchRead:
    return await svc.get_branch(branch_id)


@router.patch("/branches/{branch_id}", response_model=BranchRead, summary="Yangilash")
async def update_branch(
    branch_id: str, body: BranchUpdate, svc: SuperAdminService = Depends(_svc)
) -> BranchRead:
    return await svc.update_branch(branch_id, body)


@router.delete(
    "/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT, summary="O'chirish"
)
async def delete_branch(branch_id: str, svc: SuperAdminService = Depends(_svc)) -> None:
    await svc.delete_branch(branch_id)


@router.get(
    "/branches/{branch_id}/kitchens",
    response_model=list[KitchenRead],
    summary="Filialga biriktirilgan oshxonalar",
)
async def get_branch_kitchens(
    branch_id: str, svc: SuperAdminService = Depends(_svc)
) -> list[KitchenRead]:
    return await svc.get_branch_kitchens(branch_id)


@router.post(
    "/branches/{branch_id}/assign-kitchens",
    response_model=list[KitchenRead],
    summary="Filialga oshxonalarni biriktirish",
)
async def assign_kitchens(
    branch_id: str, body: AssignKitchensRequest, svc: SuperAdminService = Depends(_svc)
) -> list[KitchenRead]:
    return await svc.assign_kitchens(branch_id, body.kitchen_ids)


# --- Foydalanuvchilar (barcha rollar) ---
@router.get("/users", response_model=Page[UserAdminRead], summary="Foydalanuvchilar ro'yxati")
async def list_users(
    role: UserRole | None = Query(None, description="Rol bo'yicha filtr"),
    account_status: AccountStatus | None = Query(None, description="Status bo'yicha filtr"),
    search: str | None = Query(None, description="Telefon yoki ism bo'yicha qidiruv"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: SuperAdminService = Depends(_svc),
) -> Page[UserAdminRead]:
    items, total = await svc.list_users(limit, offset, role, account_status, search)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get("/users/{user_id}", response_model=UserAdminRead, summary="Foydalanuvchi")
async def get_user(user_id: str, svc: SuperAdminService = Depends(_svc)) -> UserAdminRead:
    return await svc.get_user(user_id)


@router.patch(
    "/users/{user_id}",
    response_model=UserAdminRead,
    summary="Foydalanuvchini tahrirlash (rol/status/ma'lumot)",
)
async def update_user(
    user_id: str, body: UserAdminUpdate, svc: SuperAdminService = Depends(_svc)
) -> UserAdminRead:
    return await svc.update_user(user_id, body)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Foydalanuvchini o'chirish (soft)",
)
async def delete_user(user_id: str, svc: SuperAdminService = Depends(_svc)) -> None:
    await svc.delete_user(user_id)


# --- Buyurtmalar (butun platforma) ---
@router.get("/orders", response_model=Page[OrderRead], summary="Barcha buyurtmalar (filtrlar bilan)")
async def list_orders(
    company_id: str | None = Query(None),
    kitchen_id: str | None = Query(None),
    branch_id: str | None = Query(None),
    order_status: OrderStatus | None = Query(None),
    target_date: date | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: SuperAdminService = Depends(_svc),
) -> Page[OrderRead]:
    items, total = await svc.list_orders(
        company_id, kitchen_id, branch_id, order_status, target_date, limit, offset
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get("/orders/{order_id}", response_model=OrderRead, summary="Buyurtma tafsilotlari")
async def get_order(order_id: str, svc: SuperAdminService = Depends(_svc)) -> OrderRead:
    return await svc.get_order(order_id)


@router.patch(
    "/orders/{order_id}/status",
    response_model=OrderRead,
    summary="Buyurtma holatini o'zgartirish",
)
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    svc: SuperAdminService = Depends(_svc),
) -> OrderRead:
    return await svc.update_order_status(order_id, body.status)


@router.patch(
    "/branches/{branch_id}/orders/status",
    response_model=BulkOrderStatusResponse,
    summary="Filial buyurtmalari holatini ommaviy o'zgartirish",
)
async def update_branch_orders_status(
    branch_id: str,
    body: BranchOrderStatusUpdate,
    kitchen_id: str | None = Query(None),
    svc: SuperAdminService = Depends(_svc),
) -> BulkOrderStatusResponse:
    updated = await svc.update_branch_orders_status(
        branch_id, body.target_date, body.status, kitchen_id
    )
    return BulkOrderStatusResponse(updated=updated)


# --- Tasdiqlanmagan adminlar ---
@router.get(
    "/pending-admins",
    response_model=list[PendingAdminRead],
    summary="Tasdiqlanmagan adminlar ro'yxati",
)
async def pending_admins(
    svc: SuperAdminService = Depends(_svc),
) -> list[PendingAdminRead]:
    return await svc.list_pending_admins()


@router.patch(
    "/admins/{user_id}/approve", response_model=UserRead, summary="Adminni tasdiqlash"
)
async def approve_admin(
    user_id: str, svc: SuperAdminService = Depends(_svc)
) -> UserRead:
    return await svc.approve_admin(user_id)


@router.patch(
    "/admins/{user_id}/reject", response_model=UserRead, summary="Adminni rad etish"
)
async def reject_admin(user_id: str, svc: SuperAdminService = Depends(_svc)) -> UserRead:
    return await svc.reject_admin(user_id)
