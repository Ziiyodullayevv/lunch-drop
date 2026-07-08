"""FastAPI dependency'lar — DB session va joriy foydalanuvchi."""

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthError, PermissionDeniedError
from app.core.security import decode_token
from app.db.session import get_session
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repo import UserRepository

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Bearer access token'ni tekshirib, joriy foydalanuvchini qaytaradi."""
    if credentials is None:
        raise AuthError("Avtorizatsiya tokeni kerak")

    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        raise AuthError("Token yaroqsiz yoki muddati o'tgan") from None

    if payload.get("type") != "access":
        raise AuthError("Token turi noto'g'ri")

    user = await UserRepository(session).get_by_id(payload.get("sub", ""))
    if user is None or user.deleted_at is not None:
        raise AuthError("Foydalanuvchi topilmadi")
    if not user.is_active:
        raise PermissionDeniedError("Hisob faol emas")

    return user


def require_roles(*roles: UserRole):
    """Berilgan rollardan biri bo'lishini talab qiladi."""

    async def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise PermissionDeniedError("Bu amal uchun ruxsat yo'q")
        return current_user

    return _checker


async def require_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Faqat super_admin o'ta oladigan endpointlar uchun."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise PermissionDeniedError("Faqat super admin uchun")
    return current_user


async def require_kitchen_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Faqat kitchen_admin. Data isolation: amallar token'dagi kitchen_id bo'yicha."""
    if current_user.role != UserRole.KITCHEN_ADMIN:
        raise PermissionDeniedError("Faqat oshxona admini uchun")
    if current_user.kitchen_id is None:
        raise PermissionDeniedError("Oshxona biriktirilmagan")
    return current_user


async def require_company_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Faqat company_admin. Data isolation: token'dagi company_id bo'yicha."""
    if current_user.role != UserRole.COMPANY_ADMIN:
        raise PermissionDeniedError("Faqat kompaniya admini uchun")
    if current_user.company_id is None:
        raise PermissionDeniedError("Kompaniya biriktirilmagan")
    return current_user


async def require_employee(
    current_user: User = Depends(get_current_user),
) -> User:
    """Faqat employee."""
    if current_user.role != UserRole.EMPLOYEE:
        raise PermissionDeniedError("Faqat xodim uchun")
    return current_user
