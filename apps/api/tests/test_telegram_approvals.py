from __future__ import annotations

from datetime import date

import pytest
import pytest_asyncio
from sqlalchemy import func, select

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models.branch import Branch, EmployeeBranch
from app.models.company import Company
from app.models.enums import (
    AccountStatus,
    ConnectionRequestStatus,
    OrderStatus,
    UserRole,
)
from app.models.kitchen import BranchKitchen, Kitchen
from app.models.meal import Meal, MenuSchedule
from app.models.order import Order
from app.models.telegram import ApprovalAction
from app.models.user import User
from bot.approvals import (
    TelegramApprovalError,
    begin_telegram_otp,
    claim_telegram_otp,
    link_telegram_account,
    pending_cards_for,
    process_connection_decision,
    process_decision,
)
from bot.menu import send_employee_menu
from bot.reports import build_report, current_month, parse_month
from app.services.kitchen_connection_service import KitchenConnectionService
from app.services.kitchen_service import KitchenService
from app.services.auth_service import AuthService
from app.models.otp_code import OtpCode
from app.core.security import verify_password


@pytest_asyncio.fixture(autouse=True)
async def database():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)


async def _seed_approval_flow() -> dict[str, str]:
    async with AsyncSessionLocal() as session:
        company = Company(name="Test Company", description=None, billing_day=1)
        other_company = Company(name="Other Company", description=None, billing_day=1)
        kitchen = Kitchen(
            name="Test Kitchen",
            description=None,
            phone=None,
            lat=0,
            lng=0,
            is_active=False,
        )
        session.add_all([company, other_company, kitchen])
        await session.flush()
        branch = Branch(
            company_id=company.id,
            name="HQ",
            address="Test",
            lat=0,
            lng=0,
        )
        users = {
            "super": User(
                phone="+998900000001",
                name="Super",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                account_status=AccountStatus.APPROVED,
            ),
            "company": User(
                phone="+998900000002",
                name="Company",
                role=UserRole.COMPANY_ADMIN,
                company_id=company.id,
                is_active=True,
                account_status=AccountStatus.APPROVED,
            ),
            "other_company": User(
                phone="+998900000005",
                name="Other Company",
                role=UserRole.COMPANY_ADMIN,
                company_id=other_company.id,
                is_active=True,
                account_status=AccountStatus.APPROVED,
            ),
            "kitchen": User(
                phone="+998900000003",
                name="Kitchen",
                role=UserRole.KITCHEN_ADMIN,
                kitchen_id=kitchen.id,
                is_active=False,
                account_status=AccountStatus.PENDING_APPROVAL,
            ),
            "employee": User(
                phone="+998900000004",
                name="Employee",
                role=UserRole.EMPLOYEE,
                company_id=company.id,
                is_active=True,
                account_status=AccountStatus.PENDING_APPROVAL,
            ),
        }
        session.add_all([branch, *users.values()])
        await session.flush()
        session.add(EmployeeBranch(user_id=users["employee"].id, branch_id=branch.id))
        await session.commit()
        return {key: user.id for key, user in users.items()} | {
            "kitchen_entity": kitchen.id,
            "branch": branch.id,
        }


@pytest.mark.asyncio
async def test_role_scoped_pending_and_decisions() -> None:
    ids = await _seed_approval_flow()
    await link_telegram_account(
        telegram_user_id=101,
        chat_id=101,
        username="super",
        phone="+998900000001",
    )
    await link_telegram_account(
        telegram_user_id=102,
        chat_id=102,
        username="company",
        phone="998900000002",
    )

    assert [card.kind for card in await pending_cards_for(101)] == ["admin"]
    assert [card.kind for card in await pending_cards_for(102)] == ["employee"]

    await process_decision(
        telegram_user_id=101,
        target_id=ids["kitchen"],
        approve=True,
        message_id=1,
    )
    await process_decision(
        telegram_user_id=102,
        target_id=ids["employee"],
        approve=False,
        message_id=2,
    )

    async with AsyncSessionLocal() as session:
        admin = await session.get(User, ids["kitchen"])
        employee = await session.get(User, ids["employee"])
        kitchen = await session.get(Kitchen, ids["kitchen_entity"])
        action_count = (
            await session.execute(select(func.count()).select_from(ApprovalAction))
        ).scalar_one()
        assert admin and admin.account_status == AccountStatus.APPROVED
        assert admin.is_active
        assert kitchen and kitchen.is_active
        assert employee and employee.account_status == AccountStatus.REJECTED
        assert action_count == 2


@pytest.mark.asyncio
async def test_company_admin_cannot_approve_other_company_employee() -> None:
    ids = await _seed_approval_flow()
    await link_telegram_account(
        telegram_user_id=103,
        chat_id=103,
        username="other",
        phone="+998900000005",
    )

    with pytest.raises(TelegramApprovalError, match="tegishli emas"):
        await process_decision(
            telegram_user_id=103,
            target_id=ids["employee"],
            approve=True,
            message_id=3,
        )


@pytest.mark.asyncio
async def test_approved_employee_can_link_and_view_daily_menu(monkeypatch) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "public_base_url", "https://api.lunchdrop.uz")
    ids = await _seed_approval_flow()
    target_date = date.today()
    async with AsyncSessionLocal() as session:
        employee = await session.get(User, ids["employee"])
        kitchen = await session.get(Kitchen, ids["kitchen_entity"])
        assert employee
        assert kitchen
        employee.account_status = AccountStatus.APPROVED
        kitchen.is_active = True
        meal = Meal(
            kitchen_id=ids["kitchen_entity"],
            category_id=None,
            name="Osh",
            description="Mazali osh",
            price=30000,
            image_url="/media/osh.jpg",
        )
        session.add_all(
            [
                BranchKitchen(
                    branch_id=ids["branch"], kitchen_id=ids["kitchen_entity"]
                ),
                meal,
            ]
        )
        await session.flush()
        session.add(
            MenuSchedule(
                kitchen_id=ids["kitchen_entity"],
                meal_id=meal.id,
                specific_date=target_date,
                day_of_week=None,
            )
        )
        await session.commit()

    await link_telegram_account(
        telegram_user_id=104,
        chat_id=104,
        username="employee",
        phone="+998900000004",
    )

    class FakeBot:
        def __init__(self) -> None:
            self.messages: list[str] = []
            self.photos: list[tuple[str, str]] = []

        async def send_message(self, _chat_id: int, text: str) -> None:
            self.messages.append(text)

        async def send_photo(self, _chat_id: int, photo: str, caption: str) -> None:
            self.photos.append((photo, caption))

    bot = FakeBot()
    sent = await send_employee_menu(
        bot, user_id=ids["employee"], chat_id=104, target_date=target_date
    )
    assert sent == 1
    assert bot.photos
    assert bot.photos[0][0].endswith("/media/osh.jpg")
    assert "Buyurtma qabul qilish" in bot.photos[0][1]
    assert "Yetkazish" in bot.photos[0][1]


@pytest.mark.asyncio
async def test_employee_and_company_monthly_reports_are_scoped() -> None:
    ids = await _seed_approval_flow()
    report_month = current_month()
    target_date = parse_month(report_month)[0]
    async with AsyncSessionLocal() as session:
        employee = await session.get(User, ids["employee"])
        assert employee
        employee.account_status = AccountStatus.APPROVED
        meal = Meal(
            kitchen_id=ids["kitchen_entity"],
            category_id=None,
            name="Osh",
            description=None,
            price=30000,
            image_url=None,
        )
        session.add(meal)
        await session.flush()
        session.add_all(
            [
                Order(
                    employee_id=ids["employee"],
                    branch_id=ids["branch"],
                    kitchen_id=ids["kitchen_entity"],
                    meal_id=meal.id,
                    target_date=target_date,
                    historical_price=30000,
                    status=OrderStatus.DELIVERED,
                ),
                Order(
                    employee_id=ids["employee"],
                    branch_id=ids["branch"],
                    kitchen_id=ids["kitchen_entity"],
                    meal_id=meal.id,
                    target_date=target_date,
                    historical_price=10000,
                    status=OrderStatus.CANCELLED,
                ),
            ]
        )
        await session.commit()

    await link_telegram_account(
        telegram_user_id=105,
        chat_id=105,
        username="employee-report",
        phone="+998900000004",
    )
    await link_telegram_account(
        telegram_user_id=106,
        chat_id=106,
        username="company-report",
        phone="+998900000002",
    )

    employee_summary = await build_report(105, month=report_month)
    employee_orders = await build_report(105, month=report_month, section="orders")
    company_employees = await build_report(106, month=report_month, section="employees")
    company_branches = await build_report(106, month=report_month, section="branches")
    assert "30 000 so'm" in employee_summary.text
    assert "To'lov kuni" in employee_summary.text
    assert "Yetkazildi" in employee_orders.text
    assert "Bekor qilindi" in employee_orders.text
    assert "Employee" in company_employees.text
    assert "HQ" in company_branches.text


@pytest.mark.asyncio
async def test_kitchen_admin_approves_connection_and_sees_partner_payments() -> None:
    ids = await _seed_approval_flow()
    report_month = current_month()
    target_date = parse_month(report_month)[0]
    async with AsyncSessionLocal() as session:
        kitchen_admin = await session.get(User, ids["kitchen"])
        kitchen = await session.get(Kitchen, ids["kitchen_entity"])
        employee = await session.get(User, ids["employee"])
        branch = await session.get(Branch, ids["branch"])
        assert kitchen_admin and kitchen and employee and branch
        kitchen_admin.account_status = AccountStatus.APPROVED
        kitchen_admin.is_active = True
        kitchen.is_active = True
        employee.account_status = AccountStatus.APPROVED
        await session.commit()
        request = await KitchenConnectionService(session).create_request(
            company_id=branch.company_id,
            branch_id=branch.id,
            kitchen_id=ids["kitchen_entity"],
            requested_by=ids["company"],
        )
        assert request.status == ConnectionRequestStatus.PENDING
        assert (
            await session.execute(
                select(BranchKitchen).where(
                    BranchKitchen.branch_id == branch.id,
                    BranchKitchen.kitchen_id == ids["kitchen_entity"],
                )
            )
        ).scalar_one_or_none() is None

    await link_telegram_account(
        telegram_user_id=107,
        chat_id=107,
        username="kitchen-admin",
        phone="+998900000003",
    )
    assert [card.kind for card in await pending_cards_for(107)] == ["connection"]
    await process_connection_decision(
        telegram_user_id=107, request_id=request.id, approve=True
    )

    async with AsyncSessionLocal() as session:
        link = (
            await session.execute(
                select(BranchKitchen).where(
                    BranchKitchen.branch_id == ids["branch"],
                    BranchKitchen.kitchen_id == ids["kitchen_entity"],
                )
            )
        ).scalar_one_or_none()
        assert link
        meal = Meal(
            kitchen_id=ids["kitchen_entity"],
            category_id=None,
            name="Osh",
            description=None,
            price=50000,
            image_url=None,
        )
        session.add(meal)
        await session.flush()
        session.add(
            Order(
                employee_id=ids["employee"],
                branch_id=ids["branch"],
                kitchen_id=ids["kitchen_entity"],
                meal_id=meal.id,
                target_date=target_date,
                historical_price=50000,
                system_fee=1500,
                status=OrderStatus.DELIVERED,
            )
        )
        await session.commit()

    summary = await build_report(107, month=report_month)
    partners = await build_report(107, month=report_month, section="partners")
    assert "50 000 so'm" in summary.text
    assert "48 500 so'm" in summary.text
    assert "Test Company" in partners.text
    assert "HQ" in partners.text

    async with AsyncSessionLocal() as session:
        map_companies = await KitchenService(session, ids["kitchen_entity"]).list_map_companies()
    test_company = next(company for company in map_companies if company.name == "Test Company")
    hq = next(branch for branch in test_company.branches if branch.name == "HQ")
    assert hq.connected_to_kitchen is True
    assert test_company.billing_day == 1


@pytest.mark.asyncio
async def test_telegram_otp_requires_matching_own_phone():
    async with AsyncSessionLocal() as session:
        response = await AuthService(session).send_otp("+998901112233")
    assert response.telegram_url
    token = response.telegram_url.split("otp_", 1)[1]

    await begin_telegram_otp(token=token, telegram_user_id=777)
    with pytest.raises(TelegramApprovalError, match="mos emas"):
        await claim_telegram_otp(telegram_user_id=777, phone="+998909999999")

    code = await claim_telegram_otp(telegram_user_id=777, phone="998901112233")
    assert len(code) == 6 and code.isdigit()

    async with AsyncSessionLocal() as session:
        otp = (
            await session.execute(
                select(OtpCode).where(OtpCode.phone == "+998901112233")
            )
        ).scalar_one()
    assert verify_password(code, otp.code_hash)

    with pytest.raises(TelegramApprovalError, match="Faol tasdiqlash"):
        await claim_telegram_otp(telegram_user_id=777, phone="+998901112233")
