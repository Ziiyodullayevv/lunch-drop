"""Notification biznes logikasi — yaratish (boshqa servislardan) + foydalanuvchi o'qishi."""

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.notification import Notification


async def notify(
    session: AsyncSession,
    user_id: str,
    type: str,
    title: str,
    body: str | None = None,
) -> Notification:
    """Xabarnoma yaratadi (session'ga qo'shadi; commit chaqiruvchida bo'ladi).

    Boshqa servislar (company/kitchen/super_admin/worker) shu funksiyani chaqiradi.
    """
    notification = Notification(
        user_id=user_id, type=type, title=title, body=body
    )
    session.add(notification)
    return notification


class NotificationService:
    """Foydalanuvchi o'z xabarnomalari bilan ishlaydi (har qanday rol)."""

    def __init__(self, session: AsyncSession, user_id: str) -> None:
        self.session = session
        self.user_id = user_id

    async def list(
        self, is_read: bool | None, limit: int, offset: int
    ) -> tuple[list[Notification], int]:
        filters = [Notification.user_id == self.user_id]
        if is_read is not None:
            filters.append(Notification.is_read.is_(is_read))
        items = (
            await self.session.execute(
                select(Notification)
                .where(*filters)
                .order_by(Notification.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        total = (
            await self.session.execute(
                select(func.count()).select_from(Notification).where(*filters)
            )
        ).scalar_one()
        return list(items), total

    async def unread_count(self) -> int:
        return (
            await self.session.execute(
                select(func.count())
                .select_from(Notification)
                .where(
                    Notification.user_id == self.user_id,
                    Notification.is_read.is_(False),
                )
            )
        ).scalar_one()

    async def mark_read(self, notification_id: str) -> Notification:
        n = await self.session.get(Notification, notification_id)
        if n is None or n.user_id != self.user_id:
            raise NotFoundError("Xabarnoma topilmadi")
        n.is_read = True
        await self.session.commit()
        return n

    async def mark_all_read(self) -> int:
        result = await self.session.execute(
            update(Notification)
            .where(
                Notification.user_id == self.user_id,
                Notification.is_read.is_(False),
            )
            .values(is_read=True)
        )
        await self.session.commit()
        return result.rowcount or 0
