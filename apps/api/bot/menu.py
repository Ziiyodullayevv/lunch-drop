"""Xodimlarga bugungi menyuni Telegram orqali ko'rsatish va yuborish."""

from datetime import UTC, date, datetime
from decimal import Decimal
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import structlog
from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.enums import AccountStatus, UserRole
from app.models.telegram import TelegramAccount, TelegramMenuDelivery
from app.models.user import User
from app.services.employee_service import EmployeeService

log = structlog.get_logger()


def _time(value) -> str:
    return value.strftime("%H:%M") if value else "—"


def _price(value: Decimal) -> str:
    return f"{value:,.0f}".replace(",", " ")


def _image_url(value: str | None) -> str | None:
    if not value:
        return None
    if value.startswith(("http://", "https://")):
        return value
    if not settings.public_base_url:
        return None
    return urljoin(f"{settings.public_base_url.rstrip('/')}/", value.lstrip("/"))


async def send_employee_menu(
    bot: Bot,
    *,
    user_id: str,
    chat_id: int,
    target_date: date,
) -> int:
    """Bitta xodimga menyuni yuboradi; yuborilgan taomlar sonini qaytaradi."""
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        if (
            user is None
            or user.role != UserRole.EMPLOYEE
            or not user.is_active
            or user.account_status != AccountStatus.APPROVED
            or user.deleted_at is not None
        ):
            return 0
        menu = await EmployeeService(session, user).menu(target_date)

    await bot.send_message(
        chat_id,
        f"🍽 Bugungi menyu — {target_date.strftime('%d.%m.%Y')}\n\n"
        "Taomlar siz a'zo bo'lgan filiallarning faol oshxonalaridan olindi.",
    )
    if not menu.items:
        await bot.send_message(chat_id, "Bugun uchun menyu hali belgilanmagan.")
        return 0

    for item in menu.items:
        description = item.description.strip() if item.description else "Tavsif yo'q"
        caption = (
            f"🍲 {item.name}\n"
            f"🏢 {item.kitchen_name or 'Oshxona'}\n"
            f"💰 {_price(item.price)} so'm\n\n"
            f"{description}\n\n"
            f"⏰ Buyurtma qabul qilish: {_time(item.order_cutoff_time)} gacha\n"
            f"🚚 Yetkazish: {_time(item.delivery_start_time)}–{_time(item.delivery_end_time)}"
        )
        image_url = _image_url(item.image_url)
        if image_url:
            try:
                await bot.send_photo(chat_id, photo=image_url, caption=caption)
                continue
            except Exception as exc:
                log.warning(
                    "telegram_menu_photo_failed",
                    meal_id=item.id,
                    chat_id=chat_id,
                    error=str(exc),
                )
        await bot.send_message(chat_id, caption)
    return len(menu.items)


async def send_daily_telegram_menus() -> dict[str, int]:
    """Har kuni 08:00 da bog'langan tasdiqlangan xodimlarga menyu yuboradi."""
    today = datetime.now(ZoneInfo(settings.timezone)).date()
    async with AsyncSessionLocal() as session:
        recipients = (
            await session.execute(
                select(User.id, TelegramAccount.chat_id)
                .join(TelegramAccount, TelegramAccount.user_id == User.id)
                .where(
                    User.role == UserRole.EMPLOYEE,
                    User.account_status == AccountStatus.APPROVED,
                    User.is_active.is_(True),
                    User.deleted_at.is_(None),
                    TelegramAccount.is_active.is_(True),
                )
            )
        ).all()
        already_sent = set(
            (
                await session.execute(
                    select(TelegramMenuDelivery.user_id).where(
                        TelegramMenuDelivery.target_date == today
                    )
                )
            )
            .scalars()
            .all()
        )

    from bot.config import bot_settings

    if not bot_settings.bot_token:
        return {"recipients": len(recipients), "sent": 0, "failed": len(recipients)}

    bot = Bot(bot_settings.bot_token)
    sent = failed = 0
    try:
        for user_id, chat_id in recipients:
            if user_id in already_sent:
                continue
            try:
                await send_employee_menu(
                    bot, user_id=user_id, chat_id=chat_id, target_date=today
                )
                async with AsyncSessionLocal() as session:
                    session.add(
                        TelegramMenuDelivery(
                            user_id=user_id,
                            target_date=today,
                            sent_at=datetime.now(UTC),
                        )
                    )
                    try:
                        await session.commit()
                    except IntegrityError:
                        await session.rollback()
                sent += 1
            except Exception as exc:
                failed += 1
                log.error(
                    "telegram_daily_menu_failed",
                    user_id=user_id,
                    chat_id=chat_id,
                    error=str(exc),
                )
    finally:
        await bot.session.close()
    result = {"recipients": len(recipients), "sent": sent, "failed": failed}
    log.info("telegram_daily_menus", **result)
    return result
