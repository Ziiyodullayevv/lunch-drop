from app.models.telegram import TelegramAccount
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, RoleProfileRead, UserRead
from app.models.enums import AccountStatus, UserRole


def test_user_phone_is_unique_per_role_not_globally() -> None:
    constraints = {constraint.name for constraint in User.__table__.constraints}
    phone_index = next(index for index in User.__table__.indexes if index.name == "ix_users_phone")

    assert "uq_users_phone_role" in constraints
    assert phone_index.unique is not True


def test_telegram_user_id_can_link_multiple_profiles() -> None:
    telegram_index = next(
        index
        for index in TelegramAccount.__table__.indexes
        if index.name == "ix_telegram_accounts_telegram_user_id"
    )

    assert telegram_index.unique is not True
    assert "is_selected" in TelegramAccount.__table__.columns


def test_auth_response_exposes_role_profiles() -> None:
    login = LoginRequest(
        phone="+998995476202",
        password="secret12",
        role=UserRole.KITCHEN_ADMIN,
    )
    response = MeResponse(
        user=UserRead(
            id="user-1",
            phone=login.phone,
            role=UserRole.KITCHEN_ADMIN,
            is_active=True,
            account_status=AccountStatus.APPROVED,
        ),
        profiles=[
            RoleProfileRead(id="user-1", role=UserRole.KITCHEN_ADMIN),
            RoleProfileRead(id="user-2", role=UserRole.COMPANY_ADMIN),
            RoleProfileRead(id="user-3", role=UserRole.EMPLOYEE),
        ],
    )

    assert login.role == UserRole.KITCHEN_ADMIN
    assert [profile.role for profile in response.profiles] == [
        UserRole.KITCHEN_ADMIN,
        UserRole.COMPANY_ADMIN,
        UserRole.EMPLOYEE,
    ]
