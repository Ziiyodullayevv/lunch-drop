from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.branch import Branch
    from app.models.invoice import Invoice
    from app.models.user import User


class Company(Base, TimestampMixin, SoftDeleteMixin):
    """Kompaniya/Mijoz. Super_admin yaratadi."""

    __tablename__ = "companies"

    id: Mapped[str] = uuid_pk()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # Oylik hisob-kitob kuni (1-28)
    billing_day: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    branches: Mapped[list[Branch]] = relationship(back_populates="company")
    members: Mapped[list[User]] = relationship(back_populates="company")
    invoices: Mapped[list[Invoice]] = relationship(back_populates="company")
