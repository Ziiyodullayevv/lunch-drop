"""Xavfsizlik primitivlari — parol hash (argon2) va JWT RS256 sign/verify.

Kalitlar (`keys/*.pem`) lazy o'qiladi: faqat token kerak bo'lganda. Shu sababli
kalitsiz ham (test, health) ilova ishga tushadi (security.md).
"""

import uuid
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from pathlib import Path

import jwt
from pwdlib import PasswordHash

from app.config import settings

_pwd = PasswordHash.recommended()  # argon2id


# --- Parol ---
def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd.verify(password, password_hash)


# --- JWT kalitlari (lazy + keshlangan) ---
@lru_cache
def _private_key() -> str:
    return Path(settings.jwt_private_key_path).read_text()


@lru_cache
def _public_key() -> str:
    return Path(settings.jwt_public_key_path).read_text()


def _encode(sub: str, token_type: str, expires_delta: timedelta, extra: dict | None = None) -> dict:
    now = datetime.now(UTC)
    payload: dict = {
        "sub": sub,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, _private_key(), algorithm=settings.jwt_algorithm)
    return {"token": token, "payload": payload}


def create_access_token(sub: str, role: str | None = None) -> str:
    """Qisqa muddatli access token (default 15 daqiqa)."""
    extra = {"role": role} if role else None
    return _encode(
        sub, "access", timedelta(minutes=settings.access_token_expire_minutes), extra
    )["token"]


def create_registration_token(phone: str) -> str:
    """Vaqtinchalik token — OTP tasdiqlangach admin-register uchun (15 daqiqa)."""
    return _encode(phone, "register", timedelta(minutes=15))["token"]


def create_refresh_token(sub: str) -> tuple[str, str, datetime]:
    """Uzoq muddatli refresh token. Qaytaradi: (token, jti, expires_at)."""
    result = _encode(sub, "refresh", timedelta(days=settings.refresh_token_expire_days))
    payload = result["payload"]
    return result["token"], payload["jti"], payload["exp"]


def decode_token(token: str) -> dict:
    """JWT'ni tekshirib payload qaytaradi. Yaroqsiz/muddati o'tgan bo'lsa xato ko'taradi."""
    return jwt.decode(token, _public_key(), algorithms=[settings.jwt_algorithm])
