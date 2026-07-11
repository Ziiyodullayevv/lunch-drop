from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, enum_column, uuid_pk
from app.models.enums import OrderStatus

if TYPE_CHECKING:
    from app.models.branch import Branch
    from app.models.kitchen import Kitchen
    from app.models.meal import Meal
    from app.models.user import User


class Order(Base, TimestampMixin):
    """Buyurtma — bir xodim, bir taom, aniq sana va filialga (TZ v4.0).

    Bir xodim bir kunda bir nechta buyurtma berishi mumkin (cheklov yo'q).
    `branch_id` — buyurtma vaqtida tanlangan filial (ovqat shu yerga yetkaziladi).
    `historical_price` — buyurtma vaqtidagi narx (keyin narx o'zgarsa ham buzilmaydi).
    `system_fee` — DELIVERED bo'lganda hisoblanadi (historical_price * 0.03).
    """

    __tablename__ = "orders"

    id: Mapped[str] = uuid_pk()
    employee_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    branch_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("branches.id"), nullable=False, index=True
    )
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id"), nullable=False, index=True
    )
    meal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("meals.id"), nullable=False, index=True
    )
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    historical_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    system_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )
    status: Mapped[OrderStatus] = mapped_column(
        enum_column(OrderStatus, "order_status"),
        default=OrderStatus.CREATED,
        nullable=False,
    )

    employee: Mapped[User] = relationship(back_populates="orders")
    branch: Mapped[Branch] = relationship()
    kitchen: Mapped[Kitchen] = relationship(back_populates="orders")
    meal: Mapped[Meal] = relationship()
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[str] = uuid_pk()
    order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    meal_id: Mapped[str] = mapped_column(String(36), ForeignKey("meals.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    historical_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped[Order] = relationship(back_populates="items")
    meal: Mapped[Meal] = relationship()
