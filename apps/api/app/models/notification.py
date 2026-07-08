from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.user import User


class Notification(Base, TimestampMixin):
    """Foydalanuvchi xabarnomasi (in-app). Admin amallar va order o'tishlarida yaratiladi."""

    __tablename__ = "notifications"

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    # "account_status" | "order_status" | "admin_approved"
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, server_default="false"
    )

    user: Mapped[User] = relationship()
