from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import func, select

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models.branch import Branch, EmployeeBranch
from app.models.company import Company
from app.models.enums import AccountStatus, UserRole
from app.models.kitchen import Kitchen
from app.models.telegram import ApprovalAction
from app.models.user import User
from bot.approvals import (
    TelegramApprovalError,
    link_telegram_account,
    pending_cards_for,
    process_decision,
)


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
            "kitchen_entity": kitchen.id
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
