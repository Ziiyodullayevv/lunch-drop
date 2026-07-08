from __future__ import annotations

from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.branch import Branch
    from app.models.meal import Meal, MenuCategory, MenuSchedule
    from app.models.order import Order
    from app.models.user import User


class Kitchen(Base, TimestampMixin, SoftDeleteMixin):
    """Oshxona. Buyurtma kesish va yetkazish vaqtlari shu yerda."""

    __tablename__ = "kitchens"

    id: Mapped[str] = uuid_pk()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    order_cutoff_time: Mapped[time] = mapped_column(
        Time, default=time(10, 30), nullable=False
    )
    delivery_start_time: Mapped[time] = mapped_column(
        Time, default=time(12, 30), nullable=False
    )
    delivery_end_time: Mapped[time] = mapped_column(
        Time, default=time(13, 0), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    branch_links: Mapped[list[BranchKitchen]] = relationship(back_populates="kitchen")
    admins: Mapped[list[User]] = relationship(back_populates="kitchen")
    categories: Mapped[list[MenuCategory]] = relationship(back_populates="kitchen")
    meals: Mapped[list[Meal]] = relationship(back_populates="kitchen")
    schedules: Mapped[list[MenuSchedule]] = relationship(back_populates="kitchen")
    orders: Mapped[list[Order]] = relationship(back_populates="kitchen")


class BranchKitchen(Base, TimestampMixin):
    """Filial ↔ Oshxona bog'lanishi (M:N pivot)."""

    __tablename__ = "branch_kitchens"
    __table_args__ = (
        UniqueConstraint("branch_id", "kitchen_id", name="uq_branch_kitchen"),
    )

    id: Mapped[str] = uuid_pk()
    branch_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("branches.id"), nullable=False, index=True
    )
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id"), nullable=False, index=True
    )

    branch: Mapped[Branch] = relationship(back_populates="kitchen_links")
    kitchen: Mapped[Kitchen] = relationship(back_populates="branch_links")
