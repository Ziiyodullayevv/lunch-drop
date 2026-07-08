"""SQLAlchemy deklarativ baza va umumiy mixinlar.

Barcha modellar `Base` dan meros oladi. `database.md` qoidasiga ko'ra
har bir jadvalda `id`, `created_at`, `updated_at` bo'ladi; soft delete uchun
`deleted_at` `SoftDeleteMixin` orqali qo'shiladi.
"""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum as SAEnum, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Barcha ORM modellari uchun deklarativ baza."""


def uuid_pk() -> Mapped[str]:
    """UUID (string) birlamchi kalit ustuni — barcha modellar uchun bir xil."""
    return mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )


def enum_column(enum_cls: type[StrEnum], name: str) -> SAEnum:
    """Python StrEnum'ni DB enum ustuniga aylantiradi (qiymatlar string sifatida saqlanadi)."""
    return SAEnum(
        enum_cls,
        name=name,
        values_callable=lambda e: [member.value for member in e],
        native_enum=False,  # cross-dialect (PG + SQLite test) uchun VARCHAR + CHECK
    )


class TimestampMixin:
    """`created_at` va `updated_at` ustunlari."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """Soft delete uchun `deleted_at`. O'chirilganda vaqt o'rnatiladi."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
