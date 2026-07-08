"""Kitchen Admin API (TZ 4.3) — meals CRUD, menu-schedule, order status.

Data isolation: barcha amallar token'dagi kitchen_id bo'yicha (ID tashqaridan olinmaydi).
"""

from datetime import date

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.db.session import get_session
from app.dependencies import require_kitchen_admin
from app.models.user import User
from app.schemas.common import Page
from app.schemas.dashboard import DashboardResponse
from app.schemas.meal import (
    MealCreate,
    MealRead,
    MealUpdate,
    MenuCategoryCreate,
    MenuCategoryRead,
    MenuScheduleRead,
    ScheduleMenuRequest,
)
from app.schemas.kitchen import KitchenRead, KitchenSettingsUpdate
from app.schemas.order import OrderRead, OrderStatusUpdate
from app.integrations.s3 import upload_image
from app.services.kitchen_service import KitchenService

router = APIRouter(prefix="/api/v1/kitchen", tags=["kitchen-admin"])


def _svc(
    current_user: User = Depends(require_kitchen_admin),
    session: AsyncSession = Depends(get_session),
) -> KitchenService:
    return KitchenService(session, current_user.kitchen_id)


@router.get("/dashboard", response_model=DashboardResponse, summary="Oshxona statistikasi (analytics)")
async def dashboard(
    year: int | None = Query(None, description="Oylik chart yili (default: joriy yil)"),
    svc: KitchenService = Depends(_svc),
) -> DashboardResponse:
    return await svc.dashboard(year)


# --- Oshxona sozlamalari (vaqtlar, nom, holat) ---
@router.get("/me", response_model=KitchenRead, summary="O'z oshxona ma'lumotlari")
async def get_kitchen(svc: KitchenService = Depends(_svc)) -> KitchenRead:
    return await svc.get_kitchen()


@router.patch(
    "/settings",
    response_model=KitchenRead,
    summary="Oshxona sozlamalari (qabul/yetkazish vaqtlari)",
)
async def update_settings(
    body: KitchenSettingsUpdate, svc: KitchenService = Depends(_svc)
) -> KitchenRead:
    return await svc.update_settings(body)


# --- Categories ---
@router.get("/categories", response_model=list[MenuCategoryRead], summary="Kategoriyalar")
async def list_categories(svc: KitchenService = Depends(_svc)) -> list[MenuCategoryRead]:
    return await svc.list_categories()


@router.post(
    "/categories", response_model=MenuCategoryRead,
    status_code=status.HTTP_201_CREATED, summary="Kategoriya yaratish",
)
async def create_category(
    body: MenuCategoryCreate, svc: KitchenService = Depends(_svc)
) -> MenuCategoryRead:
    return await svc.create_category(body.name)


# --- Meals ---
@router.get("/meals", response_model=Page[MealRead], summary="Taomlar")
async def list_meals(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: KitchenService = Depends(_svc),
) -> Page[MealRead]:
    items, total = await svc.list_meals(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/meals", response_model=MealRead, status_code=status.HTTP_201_CREATED,
    summary="Taom yaratish",
)
async def create_meal(body: MealCreate, svc: KitchenService = Depends(_svc)) -> MealRead:
    return await svc.create_meal(body)


@router.get("/meals/{meal_id}", response_model=MealRead, summary="Taom")
async def get_meal(meal_id: str, svc: KitchenService = Depends(_svc)) -> MealRead:
    return await svc.get_meal(meal_id)


@router.patch("/meals/{meal_id}", response_model=MealRead, summary="Taom yangilash")
async def update_meal(
    meal_id: str, body: MealUpdate, svc: KitchenService = Depends(_svc)
) -> MealRead:
    return await svc.update_meal(meal_id, body)


@router.delete(
    "/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Taom o'chirish (soft)"
)
async def delete_meal(meal_id: str, svc: KitchenService = Depends(_svc)) -> None:
    await svc.delete_meal(meal_id)


@router.post("/meals/{meal_id}/image", response_model=MealRead, summary="Taom rasmini yuklash (S3)")
async def upload_meal_image(
    meal_id: str,
    file: UploadFile = File(...),
    svc: KitchenService = Depends(_svc),
) -> MealRead:
    await svc.get_meal(meal_id)  # tegishliligini tekshir
    content = await file.read()
    url = await run_in_threadpool(
        upload_image, content, file.filename or "", file.content_type or "application/octet-stream"
    )
    return await svc.set_meal_image(meal_id, url)


# --- Menu schedule ---
@router.post(
    "/schedule-menu", response_model=MenuScheduleRead,
    status_code=status.HTTP_201_CREATED, summary="Menyuga taom qo'yish (kun/sana)",
)
async def schedule_menu(
    body: ScheduleMenuRequest, svc: KitchenService = Depends(_svc)
) -> MenuScheduleRead:
    return await svc.schedule_menu(body)


@router.get("/schedules", response_model=list[MenuScheduleRead], summary="Menyu jadvali")
async def list_schedules(
    meal_id: str | None = Query(None), svc: KitchenService = Depends(_svc)
) -> list[MenuScheduleRead]:
    return await svc.list_schedules(meal_id)


@router.delete(
    "/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Jadvaldan o'chirish"
)
async def delete_schedule(schedule_id: str, svc: KitchenService = Depends(_svc)) -> None:
    await svc.delete_schedule(schedule_id)


# --- Orders ---
@router.get("/orders", response_model=list[OrderRead], summary="Buyurtmalar")
async def list_orders(
    target_date: date | None = Query(None),
    svc: KitchenService = Depends(_svc),
) -> list[OrderRead]:
    return await svc.list_orders(target_date)


@router.get("/orders/{order_id}", response_model=OrderRead, summary="Buyurtma tafsilotlari")
async def get_order(order_id: str, svc: KitchenService = Depends(_svc)) -> OrderRead:
    return await svc.get_order(order_id)


@router.patch(
    "/orders/{order_id}/status", response_model=OrderRead, summary="Buyurtma holatini o'zgartirish"
)
async def update_order_status(
    order_id: str, body: OrderStatusUpdate, svc: KitchenService = Depends(_svc)
) -> OrderRead:
    return await svc.update_order_status(order_id, body.status)
