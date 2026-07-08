"""Umumiy CRUD repository — takrorlanuvchi DB amallarini kamaytiradi."""

from datetime import UTC, datetime
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class CrudRepository(Generic[ModelT]):
    """Bitta model uchun asosiy CRUD. Soft-delete (deleted_at) avtomatik hisobga olinadi."""

    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @property
    def _soft(self) -> bool:
        return hasattr(self.model, "deleted_at")

    async def get(self, obj_id: str) -> ModelT | None:
        obj = await self.session.get(self.model, obj_id)
        if obj is not None and self._soft and obj.deleted_at is not None:
            return None
        return obj

    async def list(self, *, limit: int = 20, offset: int = 0) -> list[ModelT]:
        stmt = select(self.model)
        if self._soft:
            stmt = stmt.where(self.model.deleted_at.is_(None))
        stmt = stmt.order_by(self.model.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count(self) -> int:
        stmt = select(func.count()).select_from(self.model)
        if self._soft:
            stmt = stmt.where(self.model.deleted_at.is_(None))
        return (await self.session.execute(stmt)).scalar_one()

    async def add(self, obj: ModelT) -> ModelT:
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def soft_delete(self, obj: ModelT) -> None:
        obj.deleted_at = datetime.now(UTC)
        await self.session.flush()
