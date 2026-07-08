"""Notification API — har qanday autentifikatsiyalangan foydalanuvchi o'z xabarnomalari."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import Page
from app.schemas.notification import NotificationRead, UnreadCountResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


def _svc(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> NotificationService:
    return NotificationService(session, current_user.id)


@router.get("", response_model=Page[NotificationRead], summary="Xabarnomalar ro'yxati")
async def list_notifications(
    is_read: bool | None = Query(None, description="o'qilgan/o'qilmagan filtri"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: NotificationService = Depends(_svc),
) -> Page[NotificationRead]:
    items, total = await svc.list(is_read, limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get("/unread-count", response_model=UnreadCountResponse, summary="O'qilmaganlar soni")
async def unread_count(svc: NotificationService = Depends(_svc)) -> UnreadCountResponse:
    return UnreadCountResponse(count=await svc.unread_count())


@router.patch("/read-all", response_model=UnreadCountResponse, summary="Hammasini o'qilgan deb belgilash")
async def mark_all_read(svc: NotificationService = Depends(_svc)) -> UnreadCountResponse:
    return UnreadCountResponse(count=await svc.mark_all_read())


@router.patch("/{notification_id}/read", response_model=NotificationRead, summary="O'qilgan deb belgilash")
async def mark_read(
    notification_id: str, svc: NotificationService = Depends(_svc)
) -> NotificationRead:
    return await svc.mark_read(notification_id)
