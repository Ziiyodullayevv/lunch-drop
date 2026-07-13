from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class TelegramAccount(Base, TimestampMixin):
    """LunchDrop admin hisobining tasdiqlangan Telegram bog'lanishi."""

    __tablename__ = "telegram_accounts"

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    telegram_user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, index=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ApprovalAction(Base, TimestampMixin):
    """Web yoki Telegram orqali qilingan tasdiqlash/rad etish auditi."""

    __tablename__ = "approval_actions"
    __table_args__ = (
        UniqueConstraint("target_user_id", name="uq_approval_action_target"),
    )

    id: Mapped[str] = uuid_pk()
    target_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    actor_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="telegram")
    telegram_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    acted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class TelegramMenuDelivery(Base, TimestampMixin):
    """Xodimga kunlik menyu yuborilganini idempotent qayd etadi."""

    __tablename__ = "telegram_menu_deliveries"
    __table_args__ = (
        UniqueConstraint("user_id", "target_date", name="uq_telegram_menu_user_date"),
    )

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class TelegramKitchenOrderSummaryDelivery(Base, TimestampMixin):
    """Oshxona adminiga kunlik buyurtmalar jamlanmasi yuborilganini qayd etadi."""

    __tablename__ = "telegram_kitchen_order_summary_deliveries"
    __table_args__ = (
        UniqueConstraint(
            "kitchen_id",
            "user_id",
            "branch_id",
            "target_date",
            name="uq_telegram_kitchen_order_summary_recipient_branch_date",
        ),
    )

    id: Mapped[str] = uuid_pk()
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    branch_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("branches.id", ondelete="CASCADE"), index=True
    )
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class TelegramDeliveryPrompt(Base, TimestampMixin):
    """Filial buyurtmalarini yo'lga chiqarish uchun kitchen admin tasdig'i."""

    __tablename__ = "telegram_delivery_prompts"
    __table_args__ = (
        UniqueConstraint(
            "kitchen_id",
            "user_id",
            "branch_id",
            "target_date",
            "action",
            name="uq_telegram_delivery_prompt_recipient_branch_date_action",
        ),
    )

    id: Mapped[str] = uuid_pk()
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    branch_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("branches.id", ondelete="CASCADE"), index=True
    )
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    telegram_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    prompted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    confirmed_by_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class EmployeeDeliveryNotice(Base, TimestampMixin):
    """Yetkazish vaqti tugagani app va Telegram orqali yuborilganini qayd etadi."""

    __tablename__ = "employee_delivery_notices"
    __table_args__ = (
        UniqueConstraint(
            "kitchen_id",
            "user_id",
            "branch_id",
            "target_date",
            name="uq_employee_delivery_notice_recipient_branch_date",
        ),
    )

    id: Mapped[str] = uuid_pk()
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    branch_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("branches.id", ondelete="CASCADE"), index=True
    )
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    app_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    telegram_notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
