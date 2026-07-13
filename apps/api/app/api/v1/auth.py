"""Auth endpointlari (v4.1) — OTP-avval oqim.

Admin: send-otp → verify-otp (temp token) → admin-register → (super_admin tasdig'i) → admin-login.
Employee: send-otp → employee-login.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.session import get_session
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AdminRegisterRequest,
    EmployeeLoginRequest,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    MeUpdate,
    OTPSendResponse,
    RefreshRequest,
    RegisterResponse,
    SendOtpRequest,
    SwitchProfileRequest,
    TokenResponse,
    UserRead,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth")


# --- OTP (umumiy) ---
@router.post("/send-otp", response_model=OTPSendResponse, tags=["auth"], summary="OTP yuborish")
async def send_otp(
    body: SendOtpRequest, session: AsyncSession = Depends(get_session)
) -> OTPSendResponse:
    """Telefon raqamiga OTP yuboradi (admin register yoki employee login uchun)."""
    return await AuthService(session).send_otp(body.phone)


@router.post(
    "/verify-otp", response_model=VerifyOtpResponse, tags=["auth"],
    summary="OTP tasdiqlash → vaqtinchalik token",
)
async def verify_otp(
    body: VerifyOtpRequest, session: AsyncSession = Depends(get_session)
) -> VerifyOtpResponse:
    """OTP'ni tasdiqlab, admin-register uchun vaqtinchalik token qaytaradi."""
    return await AuthService(session).verify_otp(body.phone, body.code)


# --- Admin ---
@router.post(
    "/admin-register", response_model=RegisterResponse, tags=["auth-admin"],
    summary="Admin ro'yxatdan o'tishi (vaqtinchalik token bilan)",
)
async def admin_register(
    body: AdminRegisterRequest, session: AsyncSession = Depends(get_session)
) -> RegisterResponse:
    """Kitchen/Company admin + muassasa yaratadi (PENDING_APPROVAL)."""
    return await AuthService(session).admin_register(body)


@router.post(
    "/admin-login", response_model=TokenResponse, tags=["auth-admin"],
    summary="Admin login (faqat APPROVED)",
)
async def admin_login(
    body: LoginRequest, session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    return await AuthService(session).login(
        body.phone,
        body.password,
        role=body.role,
        profile_id=body.profile_id,
    )


# --- Employee ---
@router.post(
    "/employee-login", response_model=TokenResponse, tags=["auth-employee"],
    summary="Employee login (telefon + OTP)",
)
async def employee_login(
    body: EmployeeLoginRequest, session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    return await AuthService(session).employee_login(body.phone, body.code)


# --- Token ---
@router.post("/refresh-token", response_model=TokenResponse, tags=["auth"], summary="Token yangilash")
async def refresh_token(
    body: RefreshRequest, session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    return await AuthService(session).refresh(body.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"], summary="Chiqish")
async def logout(
    body: LogoutRequest, session: AsyncSession = Depends(get_session)
) -> None:
    await AuthService(session).logout(body.refresh_token)


@router.get("/me", response_model=MeResponse, tags=["auth"], summary="Joriy foydalanuvchi")
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MeResponse:
    return MeResponse(
        user=UserRead.model_validate(current_user),
        profiles=await AuthService(session).list_profiles(current_user),
    )


@router.post(
    "/switch-profile",
    response_model=TokenResponse,
    tags=["auth"],
    summary="Faol rol profilini almashtirish",
)
async def switch_profile(
    body: SwitchProfileRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    return await AuthService(session).switch_profile(current_user, body.profile_id)


@router.patch(
    "/me", response_model=MeResponse, tags=["auth"],
    summary="Joriy foydalanuvchi profilini yangilash (ism/parol)",
)
async def update_me(
    body: MeUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MeResponse:
    data = body.model_dump(exclude_unset=True)
    if "name" in data:
        current_user.name = data["name"]
    if "avatar_url" in data:
        current_user.avatar_url = data["avatar_url"]
    if data.get("password"):
        current_user.password_hash = hash_password(data["password"])
    await session.commit()
    return MeResponse(
        user=UserRead.model_validate(current_user),
        profiles=await AuthService(session).list_profiles(current_user),
    )
