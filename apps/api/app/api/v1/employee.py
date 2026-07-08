"""Employee API (TZ 4.5) — onboarding, menyu, buyurtma."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_session
from app.dependencies import require_employee
from app.models.user import User
from app.models.enums import OrderStatus
from app.schemas.auth import UserRead
from app.schemas.common import Page
from app.schemas.employee import (
    CompanyPublic,
    EmployeeProfileUpdate,
    EmployeeStatusRead,
    JoinBranchRequest,
    MenuResponse,
    OrderCreate,
    OrderHistoryItem,
)
from app.schemas.order import OrderRead
from app.services.employee_service import EmployeeService

router = APIRouter(prefix="/api/v1", tags=["employee"])


def _svc(
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session),
) -> EmployeeService:
    return EmployeeService(session, current_user)


@router.get("/employee/companies", response_model=list[CompanyPublic], summary="Kompaniyalar va filiallar")
async def companies(
    search: str | None = Query(None, description="Kompaniya nomi bo'yicha qidiruv"),
    svc: EmployeeService = Depends(_svc),
) -> list[CompanyPublic]:
    return await svc.list_companies(search)


@router.post(
    "/employee/join-branch",
    response_model=EmployeeStatusRead,
    summary="Filiallarga qo'shilish so'rovi (bir nechta)",
)
async def join_branch(
    body: JoinBranchRequest, svc: EmployeeService = Depends(_svc)
) -> EmployeeStatusRead:
    return await svc.join_branches(body.branch_ids)


@router.get("/employee/status", response_model=EmployeeStatusRead, summary="O'z tasdiq holati va filiallari")
async def my_status(svc: EmployeeService = Depends(_svc)) -> EmployeeStatusRead:
    return await svc.my_status()


@router.get("/employee/me", response_model=UserRead, summary="O'z profili")
async def get_me(current_user: User = Depends(require_employee)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/employee/me", response_model=UserRead, summary="O'z profilini yangilash (ism)")
async def update_me(
    body: EmployeeProfileUpdate, svc: EmployeeService = Depends(_svc)
) -> UserRead:
    return UserRead.model_validate(await svc.update_me(body))


@router.get("/employee/menu", response_model=MenuResponse, summary="Menyu (sana + filial bo'yicha)")
async def menu(
    target_date: date | None = Query(None),
    branch_id: str | None = Query(None, description="Aniq filial; bo'sh bo'lsa barcha a'zo filiallar"),
    svc: EmployeeService = Depends(_svc),
) -> MenuResponse:
    if target_date is None:
        target_date = datetime.now(ZoneInfo(settings.timezone)).date()
    return await svc.menu(target_date, branch_id)


@router.post("/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED, summary="Buyurtma berish")
async def create_order(body: OrderCreate, svc: EmployeeService = Depends(_svc)) -> OrderRead:
    return await svc.create_order(body)


@router.get(
    "/orders",
    response_model=Page[OrderHistoryItem],
    summary="Buyurtmalar tarixi (kunlik/oylik)",
)
async def list_orders(
    month: str | None = Query(None, description="Oylik: YYYY-MM (masalan 2026-06)"),
    target_date: date | None = Query(None, description="Kunlik: aniq sana"),
    order_status: OrderStatus | None = Query(None, description="Status bo'yicha filtr"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: EmployeeService = Depends(_svc),
) -> Page[OrderHistoryItem]:
    items, total = await svc.list_orders(month, target_date, order_status, limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/orders/{order_id}",
    response_model=OrderHistoryItem,
    summary="Buyurtma tafsilotlari (status bilan)",
)
async def order_detail(
    order_id: str, svc: EmployeeService = Depends(_svc)
) -> OrderHistoryItem:
    return await svc.get_order_detail(order_id)


@router.patch("/orders/{order_id}/confirm-delivery", response_model=OrderRead, summary="Yetkazishni tasdiqlash")
async def confirm_delivery(order_id: str, svc: EmployeeService = Depends(_svc)) -> OrderRead:
    return await svc.confirm_delivery(order_id)


@router.post("/orders/{order_id}/cancel", response_model=OrderRead, summary="Buyurtmani bekor qilish")
async def cancel_order(order_id: str, svc: EmployeeService = Depends(_svc)) -> OrderRead:
    return await svc.cancel_order(order_id)
