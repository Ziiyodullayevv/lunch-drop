from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, enum_column, uuid_pk
from app.models.enums import InvoiceStatus

if TYPE_CHECKING:
    from app.models.company import Company


class Invoice(Base, TimestampMixin):
    """Oylik hisob-faktura. billing_day cron'i tomonidan yaratiladi.

    Summalar qotiriladi (eski o'zgarishlardan himoya): company 100%,
    system 3% (foyda), kitchen 97%.
    """

    __tablename__ = "invoices"

    id: Mapped[str] = uuid_pk()
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_company_expense: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )
    total_system_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )
    total_kitchen_profit: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )
    status: Mapped[InvoiceStatus] = mapped_column(
        enum_column(InvoiceStatus, "invoice_status"),
        default=InvoiceStatus.PENDING,
        nullable=False,
    )

    company: Mapped[Company] = relationship(back_populates="invoices")
