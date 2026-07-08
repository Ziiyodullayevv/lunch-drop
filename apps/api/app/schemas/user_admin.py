"""Super admin foydalanuvchilarni boshqarish schemalari."""

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AccountStatus, UserRole

_PHONE_RE = re.compile(r"^\+\d{9,15}$")


class UserAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    phone: str
    name: str | None = None
    avatar_url: str | None = None
    role: UserRole
    is_active: bool
    account_status: AccountStatus | None = None
    company_id: str | None = None
    kitchen_id: str | None = None
    created_at: datetime


class UserAdminUpdate(BaseModel):
    """Super admin foydalanuvchini tahrirlaydi — yuborilgan maydonlargina o'zgaradi."""

    name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    avatar_url: str | None = Field(default=None, max_length=512)
    role: UserRole | None = None
    account_status: AccountStatus | None = None
    is_active: bool | None = None
    company_id: str | None = None
    kitchen_id: str | None = None

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not _PHONE_RE.match(v):
            raise ValueError("Telefon raqami xalqaro formatda bo'lsin: +998901234567")
        return v
