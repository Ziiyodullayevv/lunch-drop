from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class OtpCode(Base, TimestampMixin):
    """SMS OTP kodi. Kod ochiq emas — hash qilib saqlanadi (security.md).

    Bitta telefon uchun eng so'nggi (consumed=false) yozuv tekshiriladi.
    `attempts` — noto'g'ri urinishlar soni (brute-force cheklovi uchun).
    """

    __tablename__ = "otp_codes"

    id: Mapped[str] = uuid_pk()
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
