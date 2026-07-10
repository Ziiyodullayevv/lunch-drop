"""Telegram orqali admin va xodim arizalarini xavfsiz boshqarish."""

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import or_, select

from app.db.session import AsyncSessionLocal
from app.models.branch import Branch, EmployeeBranch
from app.models.company import Company
from app.models.enums import AccountStatus, UserRole
from app.models.kitchen import Kitchen
from app.models.telegram import ApprovalAction, TelegramAccount
from app.models.user import User
from app.services.company_service import CompanyAdminService
from app.services.super_admin_service import SuperAdminService


class TelegramApprovalError(Exception):
    """Bot foydalanuvchisiga ko'rsatish xavfsiz bo'lgan xato."""


@dataclass
class ApprovalCard:
    target_id: str
    kind: str
    title: str
    details: str


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    return f"+{digits}" if digits else ""


async def link_telegram_account(
    *, telegram_user_id: int, chat_id: int, username: str | None, phone: str
) -> User:
    normalized = normalize_phone(phone)
    if not normalized:
        raise TelegramApprovalError("Telefon raqami noto'g'ri")

    async with AsyncSessionLocal() as session:
        user = (
            await session.execute(
                select(User).where(
                    or_(User.phone == normalized, User.phone == normalized.lstrip("+")),
                    User.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if user is None:
            raise TelegramApprovalError(
                "Bu telefon raqamiga bog'langan LunchDrop admin hisobi topilmadi"
            )
        if user.role not in (
            UserRole.SUPER_ADMIN,
            UserRole.COMPANY_ADMIN,
            UserRole.EMPLOYEE,
        ):
            raise TelegramApprovalError(
                "Bu rol uchun Telegram bot funksiyalari mavjud emas"
            )
        if not user.is_active:
            raise TelegramApprovalError("LunchDrop hisobingiz faol emas")
        if user.role in (UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE) and (
            user.account_status != AccountStatus.APPROVED
        ):
            label = "Company Admin" if user.role == UserRole.COMPANY_ADMIN else "Xodim"
            raise TelegramApprovalError(f"{label} hisobi hali tasdiqlanmagan")

        by_telegram = (
            await session.execute(
                select(TelegramAccount).where(
                    TelegramAccount.telegram_user_id == telegram_user_id
                )
            )
        ).scalar_one_or_none()
        by_user = (
            await session.execute(
                select(TelegramAccount).where(TelegramAccount.user_id == user.id)
            )
        ).scalar_one_or_none()

        if by_telegram is not None and by_telegram.user_id != user.id:
            raise TelegramApprovalError(
                "Bu Telegram akkaunti boshqa LunchDrop hisobiga bog'langan"
            )
        if by_user is not None and by_user.telegram_user_id != telegram_user_id:
            raise TelegramApprovalError(
                "Bu LunchDrop hisobi boshqa Telegram akkauntiga bog'langan"
            )

        binding = by_telegram or by_user
        if binding is None:
            binding = TelegramAccount(
                user_id=user.id,
                telegram_user_id=telegram_user_id,
                chat_id=chat_id,
                username=username,
                is_active=True,
            )
            session.add(binding)
        else:
            binding.chat_id = chat_id
            binding.username = username
            binding.is_active = True
        await session.commit()
        return user


async def unlink_telegram_account(telegram_user_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        binding = (
            await session.execute(
                select(TelegramAccount).where(
                    TelegramAccount.telegram_user_id == telegram_user_id
                )
            )
        ).scalar_one_or_none()
        if binding is None:
            return False
        binding.is_active = False
        await session.commit()
        return True


async def get_linked_user(telegram_user_id: int) -> User:
    async with AsyncSessionLocal() as session:
        user = (
            await session.execute(
                select(User)
                .join(TelegramAccount, TelegramAccount.user_id == User.id)
                .where(
                    TelegramAccount.telegram_user_id == telegram_user_id,
                    TelegramAccount.is_active.is_(True),
                    User.is_active.is_(True),
                    User.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if user is None:
            raise TelegramApprovalError(
                "Avval /start orqali telefon raqamingizni bog'lang"
            )
        return user


async def _admin_card(session, target: User) -> ApprovalCard:
    entity_name = "—"
    if target.role == UserRole.KITCHEN_ADMIN and target.kitchen_id:
        kitchen = await session.get(Kitchen, target.kitchen_id)
        entity_name = kitchen.name if kitchen else "—"
    elif target.role == UserRole.COMPANY_ADMIN and target.company_id:
        company = await session.get(Company, target.company_id)
        entity_name = company.name if company else "—"
    role_label = (
        "Oshxona admini"
        if target.role == UserRole.KITCHEN_ADMIN
        else "Kompaniya admini"
    )
    return ApprovalCard(
        target_id=target.id,
        kind="admin",
        title="🆕 Yangi admin arizasi",
        details=(
            f"👤 {target.name or 'Ism ko‘rsatilmagan'}\n"
            f"📞 {target.phone}\n"
            f"🔐 {role_label}\n"
            f"🏢 {entity_name}"
        ),
    )


async def _employee_card(session, target: User) -> ApprovalCard:
    company = (
        await session.get(Company, target.company_id) if target.company_id else None
    )
    branch_names = (
        (
            await session.execute(
                select(Branch.name)
                .join(EmployeeBranch, EmployeeBranch.branch_id == Branch.id)
                .where(EmployeeBranch.user_id == target.id)
                .order_by(Branch.name)
            )
        )
        .scalars()
        .all()
    )
    return ApprovalCard(
        target_id=target.id,
        kind="employee",
        title="🆕 Yangi xodim arizasi",
        details=(
            f"👤 {target.name or 'Ism ko‘rsatilmagan'}\n"
            f"📞 {target.phone}\n"
            f"🏢 {(company.name if company else '—')}\n"
            f"📍 {', '.join(branch_names) if branch_names else 'Filial ko‘rsatilmagan'}"
        ),
    )


async def pending_cards_for(telegram_user_id: int) -> list[ApprovalCard]:
    actor = await get_linked_user(telegram_user_id)
    async with AsyncSessionLocal() as session:
        if actor.role == UserRole.SUPER_ADMIN:
            targets = (
                (
                    await session.execute(
                        select(User)
                        .where(
                            User.role.in_(
                                [UserRole.KITCHEN_ADMIN, UserRole.COMPANY_ADMIN]
                            ),
                            User.account_status == AccountStatus.PENDING_APPROVAL,
                            User.deleted_at.is_(None),
                        )
                        .order_by(User.created_at)
                    )
                )
                .scalars()
                .all()
            )
            return [await _admin_card(session, target) for target in targets]

        if actor.role == UserRole.COMPANY_ADMIN and actor.company_id:
            targets = (
                (
                    await session.execute(
                        select(User)
                        .where(
                            User.role == UserRole.EMPLOYEE,
                            User.company_id == actor.company_id,
                            User.account_status == AccountStatus.PENDING_APPROVAL,
                            User.deleted_at.is_(None),
                        )
                        .order_by(User.created_at)
                    )
                )
                .scalars()
                .all()
            )
            return [await _employee_card(session, target) for target in targets]
        return []


async def card_for_target(target_id: str) -> ApprovalCard | None:
    async with AsyncSessionLocal() as session:
        target = await session.get(User, target_id)
        if target is None or target.account_status != AccountStatus.PENDING_APPROVAL:
            return None
        if target.role in (UserRole.KITCHEN_ADMIN, UserRole.COMPANY_ADMIN):
            return await _admin_card(session, target)
        if target.role == UserRole.EMPLOYEE:
            return await _employee_card(session, target)
        return None


async def recipient_chat_ids(target_id: str) -> list[int]:
    async with AsyncSessionLocal() as session:
        target = await session.get(User, target_id)
        if target is None:
            return []
        filters = [
            TelegramAccount.is_active.is_(True),
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        ]
        if target.role in (UserRole.KITCHEN_ADMIN, UserRole.COMPANY_ADMIN):
            filters.append(User.role == UserRole.SUPER_ADMIN)
        elif target.role == UserRole.EMPLOYEE and target.company_id:
            filters.extend(
                [
                    User.role == UserRole.COMPANY_ADMIN,
                    User.company_id == target.company_id,
                ]
            )
        else:
            return []
        return list(
            (
                await session.execute(
                    select(TelegramAccount.chat_id)
                    .join(User, User.id == TelegramAccount.user_id)
                    .where(*filters)
                )
            )
            .scalars()
            .all()
        )


async def process_decision(
    *, telegram_user_id: int, target_id: str, approve: bool, message_id: int | None
) -> str:
    actor = await get_linked_user(telegram_user_id)
    async with AsyncSessionLocal() as session:
        target = (
            await session.execute(
                select(User).where(User.id == target_id).with_for_update()
            )
        ).scalar_one_or_none()
        if target is None:
            raise TelegramApprovalError("Ariza topilmadi")
        if target.account_status != AccountStatus.PENDING_APPROVAL:
            raise TelegramApprovalError("Ariza allaqachon ko'rib chiqilgan")

        if actor.role == UserRole.SUPER_ADMIN:
            if target.role not in (UserRole.KITCHEN_ADMIN, UserRole.COMPANY_ADMIN):
                raise TelegramApprovalError("Bu arizani Super Admin boshqara olmaydi")
            service = SuperAdminService(session)
            if approve:
                await service.approve_admin(target.id)
            else:
                await service.reject_admin(target.id)
        elif actor.role == UserRole.COMPANY_ADMIN:
            if (
                target.role != UserRole.EMPLOYEE
                or target.company_id != actor.company_id
            ):
                raise TelegramApprovalError(
                    "Bu xodim sizning kompaniyangizga tegishli emas"
                )
            await CompanyAdminService(session, actor.company_id).update_employee_status(
                target.id,
                AccountStatus.APPROVED if approve else AccountStatus.REJECTED,
            )
        else:
            raise TelegramApprovalError("Bu amal uchun ruxsat yo'q")

        session.add(
            ApprovalAction(
                target_user_id=target.id,
                actor_user_id=actor.id,
                action="approved" if approve else "rejected",
                source="telegram",
                telegram_message_id=message_id,
                acted_at=datetime.now(UTC),
            )
        )
        await session.commit()
        return "✅ Tasdiqlandi" if approve else "❌ Rad etildi"
