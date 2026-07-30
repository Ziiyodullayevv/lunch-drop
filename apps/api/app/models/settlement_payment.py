from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class SettlementPayment(Base, TimestampMixin):
    """Kitchen admin qayd etgan kompaniya to'lovi.

    Har bir yozuv bir kompaniya, oshxona va hisob-kitob oyiga tegishli. To'lov
    holati alohida saqlanmaydi: u oy uchun tushum va barcha yozuvlar yig'indisidan
    hisoblanadi.
    """

    __tablename__ = "settlement_payments"

    id: Mapped[str] = uuid_pk()
    kitchen_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_month: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_at: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(40), nullable=True)
    transaction_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    receipt_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
