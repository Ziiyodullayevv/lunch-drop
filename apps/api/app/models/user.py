from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, enum_column, uuid_pk
from app.models.enums import AccountStatus, UserRole

if TYPE_CHECKING:
    from app.models.branch import EmployeeBranch
    from app.models.company import Company
    from app.models.kitchen import Kitchen
    from app.models.order import Order
    from app.models.refresh_token import RefreshToken


class User(Base, TimestampMixin, SoftDeleteMixin):
    """Foydalanuvchi (admin yoki xodim).

    - Admin (super/kitchen/company): super_admin yaratadi, `password_hash` bilan login.
    - Employee: telefon + OTP. Kompaniyaga `company_status` orqali qo'shiladi.
    """

    __tablename__ = "users"

    id: Mapped[str] = uuid_pk()
    phone: Mapped[str] = mapped_column(
        String(32), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        enum_column(UserRole, "user_role"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Faqat company_admin va employee uchun
    company_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=True, index=True
    )
    # Faqat kitchen_admin uchun (data isolation)
    kitchen_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("kitchens.id"), nullable=True, index=True
    )
    # Umumiy tasdiqlash holati (barcha rollar). null = yangi employee (hali join qilmagan).
    account_status: Mapped[AccountStatus | None] = mapped_column(
        enum_column(AccountStatus, "account_status"), nullable=True
    )
    # Brute-force himoyasi (admin login)
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, server_default="0"
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    company: Mapped[Company | None] = relationship(back_populates="members")
    branch_memberships: Mapped[list[EmployeeBranch]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    kitchen: Mapped[Kitchen | None] = relationship(back_populates="admins")
    orders: Mapped[list[Order]] = relationship(back_populates="employee")
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(back_populates="user")
