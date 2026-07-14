"""Xodimlarga bugungi menyuni Telegram orqali ko'rsatish va yuborish."""

import asyncio
from datetime import UTC, date, datetime
from decimal import Decimal
from html import escape
from io import BytesIO
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import httpx
import structlog
from aiogram import Bot
from aiogram.types import BufferedInputFile, InlineKeyboardButton, InlineKeyboardMarkup
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.enums import AccountStatus, UserRole
from app.models.telegram import TelegramAccount, TelegramMenuDelivery
from app.models.user import User
from app.services.employee_service import EmployeeService

log = structlog.get_logger()

MENU_COLLAGE_TILE_SIZE = 480
MENU_COLLAGE_COLUMNS = 2


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


async def _download_menu_image(client: httpx.AsyncClient, url: str) -> Image.Image | None:
    try:
        response = await client.get(url)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content)).convert("RGB")
        return ImageOps.fit(
            image,
            (MENU_COLLAGE_TILE_SIZE, MENU_COLLAGE_TILE_SIZE),
            method=Image.Resampling.LANCZOS,
        )
    except (httpx.HTTPError, OSError, UnidentifiedImageError) as exc:
        log.warning("telegram_menu_image_download_failed", image_url=url, error=str(exc))
        return None


async def _menu_collage(image_urls: list[str]) -> BufferedInputFile | None:
    """Menyudagi barcha mavjud rasmlardan bitta Telegramga mos kollaj tayyorlaydi."""
    if not image_urls:
        return None

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        images = await asyncio.gather(
            *(_download_menu_image(client, url) for url in image_urls)
        )
    tiles = [image for image in images if image is not None]
    if not tiles:
        return None

    rows = (len(tiles) + MENU_COLLAGE_COLUMNS - 1) // MENU_COLLAGE_COLUMNS
    collage = Image.new(
        "RGB",
        (MENU_COLLAGE_COLUMNS * MENU_COLLAGE_TILE_SIZE, rows * MENU_COLLAGE_TILE_SIZE),
        "white",
    )
    for index, image in enumerate(tiles):
        x = index % MENU_COLLAGE_COLUMNS * MENU_COLLAGE_TILE_SIZE
        y = index // MENU_COLLAGE_COLUMNS * MENU_COLLAGE_TILE_SIZE
        collage.paste(image, (x, y))

    output = BytesIO()
    collage.save(output, format="JPEG", quality=85, optimize=True)
    return BufferedInputFile(output.getvalue(), filename="kunlik-menyu.jpg")


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

    return await send_menu_response(bot, chat_id=chat_id, target_date=target_date, menu=menu)


async def send_menu_response(bot: Bot, *, chat_id: int, target_date: date, menu) -> int:
    """Tayyor menyuni rasm, tavsif va action tugmasi bilan bitta xabar qilib yuboradi."""
    if not menu.items:
        await bot.send_message(
            chat_id,
            f"🍽 Menyu — {target_date.strftime('%d.%m.%Y')}\n\n"
            "Bu sana uchun menyu hali belgilanmagan.",
        )
        return 0

    lines = [
        f"<b>🍽 Kunlik menyu — {target_date.strftime('%d.%m.%Y')}</b>",
        "",
    ]
    for index, item in enumerate(menu.items, start=1):
        lines.extend(
            [
                f"<b>{index}. {escape(item.name)}</b> — {_price(item.price)} so‘m",
                f"   🏢 {escape(item.kitchen_name or 'Oshxona')}",
                f"   ⏰ {_time(item.order_cutoff_time)} gacha · 🚚 "
                f"{_time(item.delivery_start_time)}–{_time(item.delivery_end_time)}",
            ]
        )
    lines.extend(["", "Quyidagi tugma orqali buyurtma bering."])
    text = "\n".join(lines)
    markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🛒 Buyurtma berish", callback_data="eo:start")]
        ]
    )
    image_urls = [url for item in menu.items if (url := _image_url(item.image_url))]
    collage = await _menu_collage(image_urls) if image_urls else None
    if collage:
        try:
            await bot.send_photo(
                chat_id,
                photo=collage,
                caption=text,
                parse_mode="HTML",
                reply_markup=markup,
            )
            return len(menu.items)
        except Exception as exc:
            log.warning(
                "telegram_menu_photo_failed",
                chat_id=chat_id,
                error=str(exc),
            )
    await bot.send_message(chat_id, text, parse_mode="HTML", reply_markup=markup)
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
