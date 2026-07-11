"""Auth biznes logikasi (v4.1).

Admin oqimi: send-otp → verify-otp (temp token) → admin-register → PENDING_APPROVAL
            → super_admin APPROVED → admin-login.
Employee oqimi: send-otp → employee-login (telefon+OTP → JWT, avtomatik yaratiladi).
"""

import asyncio
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AuthError,
    ConflictError,
    PermissionDeniedError,
    RateLimitError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_registration_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.integrations.sms import send_otp_sms
from app.models.company import Company
from app.models.enums import AccountStatus, UserRole
from app.models.kitchen import Kitchen
from app.models.user import User
from app.config import settings
from app.repositories.auth_repo import AuthRepository
from app.repositories.user_repo import UserRepository
from app.schemas.auth import (
    AdminRegisterRequest,
    OTPSendResponse,
    RegisterResponse,
    TokenResponse,
    VerifyOtpResponse,
)
from bot.notifier import send_approval_notification
from bot.config import bot_settings

log = structlog.get_logger()

OTP_LENGTH = 6
OTP_TTL_SECONDS = 180
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5
OTP_DAILY_LIMIT = 5
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCK_MINUTES = 15
_ADMIN_ROLES = (UserRole.KITCHEN_ADMIN, UserRole.COMPANY_ADMIN)
_PENDING_MSG = "Akkauntingiz hali Super Admin tomonidan tasdiqlanmagan"


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.auth = AuthRepository(session)

    async def _issue_tokens(self, user: User) -> TokenResponse:
        access = create_access_token(user.id, user.role.value)
        refresh, jti, expires_at = create_refresh_token(user.id)
        await self.auth.save_refresh_jti(user.id, jti, expires_at)
        return TokenResponse(access_token=access, refresh_token=refresh)

    def _is_test_phone(self, phone: str) -> bool:
        return bool(settings.test_phone and phone == settings.test_phone)

    async def _consume_otp(self, phone: str, code: str) -> None:
        if self._is_test_phone(phone):
            if code != settings.test_otp:
                raise AuthError("Kod noto'g'ri")
            return
        otp = await self.auth.latest_active_otp(phone)
        if otp is None:
            raise AuthError("OTP topilmadi yoki muddati o'tgan. Qayta yuboring")
        if datetime.now(UTC) >= otp.expires_at:
            raise AuthError("OTP muddati o'tgan. Qayta yuboring")
        if otp.attempts >= OTP_MAX_ATTEMPTS:
            raise RateLimitError("Juda ko'p urinish. Yangi OTP so'rang")
        if not verify_password(code, otp.code_hash):
            otp.attempts += 1
            await self.session.commit()
            raise AuthError("Kod noto'g'ri")
        otp.consumed = True

    # --- OTP yuborish (umumiy) ---
    async def send_otp(self, phone: str) -> OTPSendResponse:
        if self._is_test_phone(phone):
            return OTPSendResponse(expires_in=OTP_TTL_SECONDS)

        # Kunlik limit (oxirgi 24 soatda 5 ta)
        since = datetime.now(UTC) - timedelta(days=1)
        if await self.auth.count_otps_since(phone, since) >= OTP_DAILY_LIMIT:
            raise RateLimitError("Kunlik OTP limiti tugadi. Ertaga urinib ko'ring")

        last = await self.auth.latest_active_otp(phone)
        if last is not None:
            age = (datetime.now(UTC) - last.created_at).total_seconds()
            if age < OTP_RESEND_COOLDOWN_SECONDS:
                raise RateLimitError(
                    f"Iltimos {int(OTP_RESEND_COOLDOWN_SECONDS - age)} soniyadan keyin urinib ko'ring"
                )
        code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"
        telegram_token = secrets.token_urlsafe(24)
        telegram_token_hash = hashlib.sha256(telegram_token.encode()).hexdigest()
        expires_at = datetime.now(UTC) + timedelta(seconds=OTP_TTL_SECONDS)
        await self.auth.create_otp(phone, hash_password(code), expires_at, telegram_token_hash)
        await self.session.commit()
        telegram_url = f"https://t.me/{bot_settings.bot_username}?start=otp_{telegram_token}"
        if settings.sms_api_url and settings.sms_api_key:
            await send_otp_sms(phone, code)
        log.info("otp_sent", phone=phone)
        return OTPSendResponse(expires_in=OTP_TTL_SECONDS, telegram_url=telegram_url)

    # --- OTP tasdiqlash → vaqtinchalik token (admin register uchun) ---
    async def verify_otp(self, phone: str, code: str) -> VerifyOtpResponse:
        await self._consume_otp(phone, code)
        await self.session.commit()
        return VerifyOtpResponse(registration_token=create_registration_token(phone))

    # --- Employee login (telefon + OTP → JWT) ---
    async def employee_login(self, phone: str, code: str) -> TokenResponse:
        await self._consume_otp(phone, code)
        user = await self.users.get_by_phone(phone)
        if user is None:
            user = User(phone=phone, role=UserRole.EMPLOYEE, is_active=True)
            await self.users.add(user)
            log.info("employee_created", user_id=user.id)
        elif user.role != UserRole.EMPLOYEE:
            raise AuthError("Bu raqam admin akkaunti — parol bilan kiring")
        if not user.is_active or user.account_status == AccountStatus.INACTIVE:
            raise PermissionDeniedError("Hisob faol emas")
        tokens = await self._issue_tokens(user)
        await self.session.commit()
        log.info("employee_login", user_id=user.id)
        return tokens

    # --- Admin register (vaqtinchalik token bilan) ---
    async def admin_register(self, data: AdminRegisterRequest) -> RegisterResponse:
        try:
            payload = decode_token(data.registration_token)
        except jwt.PyJWTError:
            raise AuthError("Registratsiya tokeni yaroqsiz yoki muddati o'tgan") from None
        if payload.get("type") != "register":
            raise AuthError("Token turi noto'g'ri")
        phone = payload["sub"]

        if await self.users.get_by_phone(phone) is not None:
            raise ConflictError("Bu telefon raqami allaqachon ro'yxatdan o'tgan")

        kitchen_id = company_id = None
        if data.role == UserRole.KITCHEN_ADMIN:
            kitchen = Kitchen(
                name=data.name,
                description=data.description,
                phone=data.institution_phone,
                lat=data.lat,
                lng=data.lng,
                is_active=False,
            )
            self.session.add(kitchen)
            await self.session.flush()
            kitchen_id = kitchen.id
        else:  # company_admin
            company = Company(
                name=data.name,
                description=data.description,
                billing_day=data.billing_day or 1,
            )
            self.session.add(company)
            await self.session.flush()
            company_id = company.id

        user = await self.users.add(
            User(
                phone=phone,
                name=data.full_name,
                password_hash=hash_password(data.password),
                role=data.role,
                is_active=False,
                account_status=AccountStatus.PENDING_APPROVAL,
                kitchen_id=kitchen_id,
                company_id=company_id,
            )
        )
        await self.session.commit()
        asyncio.create_task(send_approval_notification(user.id))
        log.info("admin_registered", role=data.role.value, phone=phone)
        return RegisterResponse()

    # --- Admin login ---
    async def login(self, phone: str, password: str) -> TokenResponse:
        user = await self.users.get_by_phone(phone)
        if user is None or not user.password_hash:
            raise AuthError("Telefon yoki parol noto'g'ri")

        now = datetime.now(UTC)
        if user.locked_until is not None and user.locked_until > now:
            raise PermissionDeniedError(
                "Hisob ko'p marta xato urinish tufayli vaqtincha bloklangan. Keyinroq urinib ko'ring"
            )

        if not verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=LOGIN_LOCK_MINUTES)
                user.failed_login_attempts = 0
            await self.session.commit()
            raise AuthError("Telefon yoki parol noto'g'ri")

        # To'g'ri parol — hisoblagichni tozalash
        user.failed_login_attempts = 0
        user.locked_until = None

        if user.account_status == AccountStatus.REJECTED:
            raise PermissionDeniedError("Arizangiz rad etilgan")
        if user.role in _ADMIN_ROLES and user.account_status != AccountStatus.APPROVED:
            raise PermissionDeniedError(_PENDING_MSG)
        if not user.is_active:
            raise PermissionDeniedError("Hisob faol emas")
        tokens = await self._issue_tokens(user)
        await self.session.commit()
        log.info("login_success", user_id=user.id)
        return tokens

    # --- Token yangilash / logout ---
    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
        except jwt.PyJWTError:
            raise AuthError("Refresh token yaroqsiz") from None
        if payload.get("type") != "refresh":
            raise AuthError("Token turi noto'g'ri")
        jti = payload.get("jti")
        stored = await self.auth.get_refresh_jti(jti) if jti else None
        if stored is None:
            raise AuthError("Refresh token bekor qilingan")
        user = await self.users.get_by_id(payload["sub"])
        if user is None or user.deleted_at is not None or not user.is_active:
            raise AuthError("Foydalanuvchi mavjud emas yoki faol emas")
        await self.auth.delete_refresh_jti(jti)
        tokens = await self._issue_tokens(user)
        await self.session.commit()
        return tokens

    async def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            if jti:
                await self.auth.delete_refresh_jti(jti)
                await self.session.commit()
        except jwt.PyJWTError:
            return
