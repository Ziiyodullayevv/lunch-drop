"""Auth schemalar (v4.1) — OTP-avval oqim, admin-register, employee-login."""

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import AccountStatus, UserRole

_PHONE_RE = re.compile(r"^\+\d{9,15}$")


def _normalize_phone(v: str) -> str:
    v = v.strip()
    if not _PHONE_RE.match(v):
        raise ValueError("Telefon raqami xalqaro formatda bo'lsin: +998901234567")
    return v


class _PhoneMixin(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return _normalize_phone(v)


# --- OTP (umumiy: admin register yoki employee login) ---
class SendOtpRequest(_PhoneMixin):
    pass


class OTPSendResponse(BaseModel):
    message: str = "OTP yuborildi"
    expires_in: int


class VerifyOtpRequest(_PhoneMixin):
    code: str = Field(..., min_length=4, max_length=8)


class VerifyOtpResponse(BaseModel):
    """Admin ro'yxatdan o'tishini yakunlash uchun vaqtinchalik token."""

    registration_token: str
    expires_in: int = 900


class EmployeeLoginRequest(_PhoneMixin):
    code: str = Field(..., min_length=4, max_length=8)


# --- Admin register (vaqtinchalik token bilan) ---
class AdminRegisterRequest(BaseModel):
    registration_token: str
    role: UserRole
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    # Muassasa ma'lumotlari
    name: str = Field(..., min_length=1, max_length=255)  # kitchen/company nomi
    description: str | None = None
    institution_phone: str | None = Field(default=None, max_length=32)  # kitchen telefoni
    lat: float | None = None  # kitchen uchun majburiy
    lng: float | None = None
    billing_day: int | None = Field(default=None, ge=1, le=28)  # company uchun

    @model_validator(mode="after")
    def _check(self) -> "AdminRegisterRequest":
        if self.role not in (UserRole.KITCHEN_ADMIN, UserRole.COMPANY_ADMIN):
            raise ValueError("Faqat kitchen_admin yoki company_admin ro'yxatdan o'tadi")
        if self.role == UserRole.KITCHEN_ADMIN and (self.lat is None or self.lng is None):
            raise ValueError("Oshxona uchun lat va lng majburiy")
        return self


# --- Admin login ---
class LoginRequest(_PhoneMixin):
    password: str = Field(..., min_length=6, max_length=128)


# --- Token ---
class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    message: str = "Ro'yxatdan o'tish yakunlandi. Super Admin tasdig'i kutilmoqda"
    account_status: AccountStatus = AccountStatus.PENDING_APPROVAL


# --- O'qish ---
class UserRead(BaseModel):
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


class MeResponse(BaseModel):
    user: UserRead


class MeUpdate(BaseModel):
    """Joriy foydalanuvchi o'z profilini yangilaydi (ism / parol / rasm)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    # /uploads/image dan olingan URL; null yuborilsa rasm o'chiriladi
    avatar_url: str | None = Field(default=None, max_length=512)


class PendingAdminRead(BaseModel):
    """Super admin ko'radigan tasdiqlanmagan admin."""

    id: str
    full_name: str | None
    phone: str
    role: UserRole
    account_status: AccountStatus | None
    entity_name: str | None = None
    created_at: datetime
