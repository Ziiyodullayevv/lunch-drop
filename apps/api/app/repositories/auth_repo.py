"""OTP va refresh token DB access."""

from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.otp_code import OtpCode
from app.models.refresh_token import RefreshToken


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- OTP ---
    async def latest_active_otp(self, phone: str) -> OtpCode | None:
        """Telefon uchun eng so'nggi ishlatilmagan OTP."""
        result = await self.session.execute(
            select(OtpCode)
            .where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
            .order_by(OtpCode.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def count_otps_since(self, phone: str, since: datetime) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(OtpCode)
            .where(OtpCode.phone == phone, OtpCode.created_at >= since)
        )
        return result.scalar_one()

    async def create_otp(
        self, phone: str, code_hash: str, expires_at: datetime
    ) -> OtpCode:
        otp = OtpCode(phone=phone, code_hash=code_hash, expires_at=expires_at)
        self.session.add(otp)
        await self.session.flush()
        return otp

    # --- Refresh tokens (jti DB'da saqlanadi; logout/rotation uchun) ---
    async def save_refresh_jti(
        self, user_id: str, jti: str, expires_at: datetime
    ) -> None:
        self.session.add(
            RefreshToken(user_id=user_id, token=jti, expires_at=expires_at)
        )
        await self.session.flush()

    async def get_refresh_jti(self, jti: str) -> RefreshToken | None:
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token == jti)
        )
        return result.scalar_one_or_none()

    async def delete_refresh_jti(self, jti: str) -> None:
        await self.session.execute(
            delete(RefreshToken).where(RefreshToken.token == jti)
        )
