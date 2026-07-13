"""Telegram orqali admin va xodim arizalarini xavfsiz boshqarish."""

from dataclasses import dataclass
from datetime import UTC, datetime
import hashlib
import secrets

from sqlalchemy import or_, select

from app.db.session import AsyncSessionLocal
from app.models.branch import Branch, EmployeeBranch
from app.models.company import Company
from app.models.enums import AccountStatus, UserRole
from app.models.kitchen import Kitchen
from app.models.telegram import ApprovalAction, TelegramAccount
from app.models.kitchen_connection import KitchenConnectionRequest
from app.models.enums import ConnectionRequestStatus
from app.models.user import User
from app.models.otp_code import OtpCode
from app.core.security import hash_password
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


async def begin_telegram_otp(*, token: str, telegram_user_id: int) -> None:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    async with AsyncSessionLocal() as session:
        otp = (
            await session.execute(
                select(OtpCode).where(
                    OtpCode.telegram_token_hash == token_hash,
                    OtpCode.consumed.is_(False),
                    OtpCode.telegram_claimed_at.is_(None),
                    OtpCode.expires_at > datetime.now(UTC),
                )
            )
        ).scalar_one_or_none()
        if otp is None:
            raise TelegramApprovalError("Havola eskirgan. Ilovadan yangi kod so‘rang")
        otp.telegram_user_id = telegram_user_id
        await session.commit()


async def claim_telegram_otp(*, telegram_user_id: int, phone: str) -> str:
    normalized = normalize_phone(phone)
    async with AsyncSessionLocal() as session:
        otp = (
            await session.execute(
                select(OtpCode)
                .where(
                    OtpCode.telegram_user_id == telegram_user_id,
                    OtpCode.consumed.is_(False),
                    OtpCode.telegram_claimed_at.is_(None),
                    OtpCode.expires_at > datetime.now(UTC),
                )
                .order_by(OtpCode.created_at.desc())
                .with_for_update()
                .limit(1)
            )
        ).scalar_one_or_none()
        if otp is None:
            raise TelegramApprovalError("Faol tasdiqlash so‘rovi yo‘q. Ilovadagi havolani qayta oching")
        if normalize_phone(otp.phone) != normalized:
            raise TelegramApprovalError("Telegram telefon raqami ilovada kiritilgan raqamga mos emas")
        code = f"{secrets.randbelow(1_000_000):06d}"
        otp.code_hash = hash_password(code)
        otp.telegram_claimed_at = datetime.now(UTC)
        otp.telegram_token_hash = None
        await session.commit()
        return code


async def link_telegram_account(
    *, telegram_user_id: int, chat_id: int, username: str | None, phone: str
) -> User:
    normalized = normalize_phone(phone)
    if not normalized:
        raise TelegramApprovalError("Telefon raqami noto'g'ri")

    async with AsyncSessionLocal() as session:
        profiles = list(
            (
                await session.execute(
                    select(User).where(
                        or_(
                            User.phone == normalized,
                            User.phone == normalized.lstrip("+"),
                        ),
                        User.deleted_at.is_(None),
                    )
                )
            ).scalars().all()
        )
        if not profiles:
            raise TelegramApprovalError(
                "Bu telefon raqamiga bog'langan LunchDrop hisobi topilmadi"
            )
        available = [
            profile
            for profile in profiles
            if profile.is_active
            and (
                profile.role == UserRole.SUPER_ADMIN
                or profile.account_status == AccountStatus.APPROVED
            )
        ]
        if not available:
            raise TelegramApprovalError("Faol yoki tasdiqlangan rol profilingiz yo'q")

        existing = list(
            (
                await session.execute(
                    select(TelegramAccount).where(
                        TelegramAccount.user_id.in_(
                            [profile.id for profile in profiles]
                        )
                    )
                )
            ).scalars().all()
        )
        if any(binding.telegram_user_id != telegram_user_id for binding in existing):
            raise TelegramApprovalError("Rol profillaridan biri boshqa Telegram'ga bog'langan")

        bindings_by_user = {binding.user_id: binding for binding in existing}
        available_ids = {profile.id for profile in available}
        selected_user_id = next(
            (
                binding.user_id
                for binding in existing
                if binding.is_selected and binding.user_id in available_ids
            ),
            available[0].id,
        )
        for profile in available:
            binding = bindings_by_user.get(profile.id)
            if binding is None:
                binding = TelegramAccount(
                    user_id=profile.id,
                    telegram_user_id=telegram_user_id,
                    chat_id=chat_id,
                    username=username,
                    is_active=True,
                    is_selected=profile.id == selected_user_id,
                )
                session.add(binding)
            else:
                binding.is_selected = profile.id == selected_user_id
                binding.is_active = True
            binding.chat_id = chat_id
            binding.username = username
        await session.commit()
        return next(profile for profile in available if profile.id == selected_user_id)


async def unlink_telegram_account(telegram_user_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        bindings = list(
            (
                await session.execute(
                    select(TelegramAccount).where(
                        TelegramAccount.telegram_user_id == telegram_user_id
                    )
                )
            ).scalars().all()
        )
        if not bindings:
            return False
        for binding in bindings:
            binding.is_active = False
            binding.is_selected = False
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
                .order_by(TelegramAccount.is_selected.desc(), User.created_at)
                .limit(1)
            )
        ).scalar_one_or_none()
        if user is None:
            raise TelegramApprovalError(
                "Avval /start orqali telefon raqamingizni bog'lang"
            )
        return user


async def telegram_profiles(telegram_user_id: int) -> list[User]:
    async with AsyncSessionLocal() as session:
        return list(
            (
                await session.execute(
                    select(User)
                    .join(TelegramAccount, TelegramAccount.user_id == User.id)
                    .where(
                        TelegramAccount.telegram_user_id == telegram_user_id,
                        TelegramAccount.is_active.is_(True),
                        User.is_active.is_(True),
                        User.deleted_at.is_(None),
                    )
                    .order_by(User.created_at)
                )
            ).scalars().all()
        )


async def select_telegram_profile(
    telegram_user_id: int, profile_id: str
) -> User:
    async with AsyncSessionLocal() as session:
        bindings = list(
            (
                await session.execute(
                    select(TelegramAccount).where(
                        TelegramAccount.telegram_user_id == telegram_user_id,
                        TelegramAccount.is_active.is_(True),
                    )
                )
            ).scalars().all()
        )
        selected = next((item for item in bindings if item.user_id == profile_id), None)
        if selected is None:
            raise TelegramApprovalError("Rol profili topilmadi")
        for binding in bindings:
            binding.is_selected = binding.id == selected.id
        user = await session.get(User, profile_id)
        if user is None or not user.is_active or user.deleted_at is not None:
            raise TelegramApprovalError("Rol profili faol emas")
        await session.commit()
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
        if actor.role == UserRole.KITCHEN_ADMIN and actor.kitchen_id:
            requests = (
                (
                    await session.execute(
                        select(KitchenConnectionRequest)
                        .where(
                            KitchenConnectionRequest.kitchen_id == actor.kitchen_id,
                            KitchenConnectionRequest.status
                            == ConnectionRequestStatus.PENDING,
                        )
                        .order_by(KitchenConnectionRequest.created_at)
                    )
                )
                .scalars()
                .all()
            )
            cards = []
            for request in requests:
                company = await session.get(Company, request.company_id)
                branch = await session.get(Branch, request.branch_id)
                cards.append(
                    ApprovalCard(
                        target_id=request.id,
                        kind="connection",
                        title="🔗 Yangi ulanish so'rovi",
                        details=(
                            f"🏢 {(company.name if company else '—')}\n"
                            f"📍 {(branch.name if branch else '—')}\n"
                            f"📅 To'lov kuni: har oyning "
                            f"{company.billing_day if company else '—'}-kuni"
                        ),
                    )
                )
            return cards
        return []


async def connection_card(request_id: str) -> ApprovalCard | None:
    async with AsyncSessionLocal() as session:
        request = await session.get(KitchenConnectionRequest, request_id)
        if request is None or request.status != ConnectionRequestStatus.PENDING:
            return None
        company = await session.get(Company, request.company_id)
        branch = await session.get(Branch, request.branch_id)
        return ApprovalCard(
            target_id=request.id,
            kind="connection",
            title="🔗 Yangi ulanish so'rovi",
            details=(
                f"🏢 {(company.name if company else '—')}\n"
                f"📍 {(branch.name if branch else '—')}\n"
                f"📅 To'lov kuni: har oyning "
                f"{company.billing_day if company else '—'}-kuni"
            ),
        )


async def connection_recipient_chat_ids(request_id: str) -> list[int]:
    async with AsyncSessionLocal() as session:
        request = await session.get(KitchenConnectionRequest, request_id)
        if request is None:
            return []
        return list(
            (
                await session.execute(
                    select(TelegramAccount.chat_id)
                    .join(User, User.id == TelegramAccount.user_id)
                    .where(
                        User.role == UserRole.KITCHEN_ADMIN,
                        User.kitchen_id == request.kitchen_id,
                        User.is_active.is_(True),
                        User.deleted_at.is_(None),
                        TelegramAccount.is_active.is_(True),
                    )
                )
            )
            .scalars()
            .all()
        )


async def process_connection_decision(
    *, telegram_user_id: int, request_id: str, approve: bool
) -> str:
    actor = await get_linked_user(telegram_user_id)
    if actor.role != UserRole.KITCHEN_ADMIN or not actor.kitchen_id:
        raise TelegramApprovalError("Bu amal faqat Kitchen Admin uchun")
    from app.services.kitchen_connection_service import KitchenConnectionService

    async with AsyncSessionLocal() as session:
        try:
            await KitchenConnectionService(session).review(
                request_id=request_id,
                kitchen_id=actor.kitchen_id,
                reviewer_id=actor.id,
                approve=approve,
            )
        except Exception as exc:
            raise TelegramApprovalError(str(exc)) from exc
    return "✅ Ulanish tasdiqlandi" if approve else "❌ Ulanish rad etildi"


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
