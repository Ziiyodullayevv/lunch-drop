from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, enum_column, uuid_pk
from app.models.enums import ConnectionRequestStatus


class KitchenConnectionRequest(Base, TimestampMixin):
    """Filialning oshxonaga ulanish arizasi; approvaldan keyin BranchKitchen yaratiladi."""

    __tablename__ = "kitchen_connection_requests"

    id: Mapped[str] = uuid_pk()
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    branch_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("branches.id"), nullable=False, index=True
    )
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id"), nullable=False, index=True
    )
    status: Mapped[ConnectionRequestStatus] = mapped_column(
        enum_column(ConnectionRequestStatus, "connection_request_status"),
        default=ConnectionRequestStatus.PENDING,
        nullable=False,
        index=True,
    )
    requested_by_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    reviewed_by_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
