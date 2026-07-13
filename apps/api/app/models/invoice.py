from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, UniqueConstraint
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
    branch_summaries: Mapped[list[InvoiceBranchSummary]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )
    employee_summaries: Mapped[list[InvoiceEmployeeSummary]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )


class InvoiceBranchSummary(Base, TimestampMixin):
    __tablename__ = "invoice_branch_summaries"

    id: Mapped[str] = uuid_pk()
    invoice_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    branch_id: Mapped[str] = mapped_column(String(36), ForeignKey("branches.id"), nullable=False, index=True)
    order_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_system_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    invoice: Mapped[Invoice] = relationship(back_populates="branch_summaries")


class InvoiceEmployeeSummary(Base, TimestampMixin):
    __tablename__ = "invoice_employee_summaries"

    id: Mapped[str] = uuid_pk()
    invoice_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    branch_id: Mapped[str] = mapped_column(String(36), ForeignKey("branches.id"), nullable=False, index=True)
    order_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_system_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    invoice: Mapped[Invoice] = relationship(back_populates="employee_summaries")


class EmployeeMonthlyPayment(Base, TimestampMixin):
    """Kompaniya xodimining muayyan oy uchun to'lov holati."""

    __tablename__ = "employee_monthly_payments"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "employee_id", "period_month",
            name="uq_employee_monthly_payment",
        ),
    )

    id: Mapped[str] = uuid_pk()
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_month: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[InvoiceStatus] = mapped_column(
        enum_column(InvoiceStatus, "employee_monthly_payment_status"),
        default=InvoiceStatus.PENDING,
        nullable=False,
    )
