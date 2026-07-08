from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.kitchen import Kitchen


class MenuCategory(Base, TimestampMixin):
    """Menyu kategoriyasi (oshxona doirasida)."""

    __tablename__ = "menu_categories"

    id: Mapped[str] = uuid_pk()
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    kitchen: Mapped[Kitchen] = relationship(back_populates="categories")
    meals: Mapped[list[Meal]] = relationship(back_populates="category")


class Meal(Base, TimestampMixin, SoftDeleteMixin):
    """Taom. Oshxona + kategoriyaga tegishli."""

    __tablename__ = "meals"

    id: Mapped[str] = uuid_pk()
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id"), nullable=False, index=True
    )
    category_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("menu_categories.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    kitchen: Mapped[Kitchen] = relationship(back_populates="meals")
    category: Mapped[MenuCategory | None] = relationship(back_populates="meals")
    schedules: Mapped[list[MenuSchedule]] = relationship(back_populates="meal")


class MenuSchedule(Base, TimestampMixin):
    """Taom qaysi kunda mavjudligi.

    `specific_date` ustun (bayram/maxsus sana) — birinchi navbatda tekshiriladi;
    bo'lmasa `day_of_week` (1=Du … 7=Yak) odatiy haftalik menyu sifatida ishlatiladi.
    """

    __tablename__ = "menu_schedules"

    id: Mapped[str] = uuid_pk()
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id"), nullable=False, index=True
    )
    meal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meals.id"), nullable=False, index=True
    )
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    specific_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    kitchen: Mapped[Kitchen] = relationship(back_populates="schedules")
    meal: Mapped[Meal] = relationship(back_populates="schedules")
