"""LunchDrop'ning yagona interaktiv Telegram approval boti."""

import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import (
    BotCommand,
    CallbackQuery,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)

from app.config import settings
from app.models.enums import UserRole
from bot.approvals import (
    begin_telegram_otp,
    claim_telegram_otp,
    TelegramApprovalError,
    get_linked_user,
    link_telegram_account,
    pending_cards_for,
    process_connection_decision,
    process_decision,
    unlink_telegram_account,
)
from bot.config import bot_settings
from bot.menu import send_employee_menu
from bot.notifier import approval_markup
from bot.reports import build_report

dp = Dispatcher()


def _role_label(role: UserRole) -> str:
    return {
        UserRole.SUPER_ADMIN: "Super Admin",
        UserRole.COMPANY_ADMIN: "Company Admin",
        UserRole.KITCHEN_ADMIN: "Kitchen Admin",
        UserRole.EMPLOYEE: "Xodim",
    }.get(role, role.value)


async def _send_pending(message: Message) -> None:
    if message.from_user is None:
        return
    try:
        cards = await pending_cards_for(message.from_user.id)
    except TelegramApprovalError as exc:
        await message.answer(str(exc))
        return
    if not cards:
        await message.answer("✅ Tasdiqlashni kutayotgan arizalar yo'q")
        return
    await message.answer(f"⏳ Tasdiqlashni kutayotgan arizalar: {len(cards)} ta")
    for card in cards:
        await message.answer(
            f"{card.title}\n\n{card.details}",
            reply_markup=approval_markup(card.kind, card.target_id),
        )


@dp.message(Command("start"))
async def cmd_start(message: Message) -> None:
    if message.from_user is None:
        return
    payload = (message.text or "").split(maxsplit=1)
    if len(payload) == 2 and payload[1].startswith("otp_"):
        try:
            await begin_telegram_otp(
                token=payload[1][4:], telegram_user_id=message.from_user.id
            )
        except TelegramApprovalError as exc:
            await message.answer(str(exc))
            return
        keyboard = ReplyKeyboardMarkup(
            keyboard=[[KeyboardButton(text="📱 Telefon raqamimni tasdiqlash", request_contact=True)]],
            resize_keyboard=True,
            one_time_keyboard=True,
        )
        await message.answer(
            "Tasdiqlash kodini olish uchun Telegram’dagi o‘z telefon raqamingizni yuboring.",
            reply_markup=keyboard,
        )
        return
    try:
        user = await get_linked_user(message.from_user.id)
    except TelegramApprovalError:
        keyboard = ReplyKeyboardMarkup(
            keyboard=[
                [
                    KeyboardButton(
                        text="📱 Telefon raqamimni ulash", request_contact=True
                    )
                ]
            ],
            resize_keyboard=True,
            one_time_keyboard=True,
        )
        await message.answer(
            "LunchDrop tasdiqlash botiga xush kelibsiz.\n\n"
            "Xavfsizlik uchun Telegram'dagi o'z telefon raqamingizni yuboring. "
            "Raqam tasdiqlangan LunchDrop hisobiga mos bo'lishi kerak.",
            reply_markup=keyboard,
        )
        return
    await message.answer(
        f"✅ Hisob bog'langan\n👤 {user.name or '—'}\n🔐 {_role_label(user.role)}\n\n"
        + (
            "Bugungi taomlarni /menu orqali ko'rishingiz mumkin. Menyu har kuni "
            "soat 08:00 da avtomatik yuboriladi."
            if user.role == UserRole.EMPLOYEE
            else "Yangi ariza kelganda bot avtomatik xabar yuboradi. /pending orqali "
            "kutilayotgan arizalarni qayta ko'rishingiz mumkin."
        ),
        reply_markup=ReplyKeyboardRemove(),
    )


@dp.message(lambda message: message.contact is not None)
async def handle_contact(message: Message) -> None:
    if message.from_user is None or message.contact is None:
        return
    if message.contact.user_id != message.from_user.id:
        await message.answer("Faqat o'zingizning Telegram kontaktingizni yuboring")
        return
    try:
        code = await claim_telegram_otp(
            telegram_user_id=message.from_user.id,
            phone=message.contact.phone_number,
        )
    except TelegramApprovalError as otp_exc:
        if "Faol tasdiqlash" not in str(otp_exc):
            await message.answer(str(otp_exc), reply_markup=ReplyKeyboardRemove())
            return
    else:
        await message.answer(
            f"✅ LunchDrop tasdiqlash kodi: <code>{code}</code>\n\nKod 3 daqiqa amal qiladi.",
            parse_mode="HTML",
            reply_markup=ReplyKeyboardRemove(),
        )
        return
    try:
        user = await link_telegram_account(
            telegram_user_id=message.from_user.id,
            chat_id=message.chat.id,
            username=message.from_user.username,
            phone=message.contact.phone_number,
        )
    except TelegramApprovalError as exc:
        await message.answer(str(exc))
        return
    await message.answer(
        f"✅ Telegram hisobingiz LunchDrop'ga bog'landi.\n"
        f"👤 {user.name or '—'}\n🔐 {_role_label(user.role)}",
        reply_markup=ReplyKeyboardRemove(),
    )
    if user.role == UserRole.EMPLOYEE:
        today = datetime.now(ZoneInfo(settings.timezone)).date()
        await send_employee_menu(
            message.bot, user_id=user.id, chat_id=message.chat.id, target_date=today
        )
    else:
        await _send_pending(message)


@dp.message(Command("pending"))
async def cmd_pending(message: Message) -> None:
    await _send_pending(message)


@dp.message(Command("menu"))
async def cmd_menu(message: Message) -> None:
    if message.from_user is None:
        return
    try:
        user = await get_linked_user(message.from_user.id)
    except TelegramApprovalError as exc:
        await message.answer(str(exc))
        return
    if user.role != UserRole.EMPLOYEE:
        await message.answer("/menu faqat xodimlar uchun")
        return
    today = datetime.now(ZoneInfo(settings.timezone)).date()
    await send_employee_menu(
        message.bot, user_id=user.id, chat_id=message.chat.id, target_date=today
    )


@dp.message(Command("hisobot"))
async def cmd_report(message: Message) -> None:
    if message.from_user is None:
        return
    parts = (message.text or "").split(maxsplit=1)
    month = parts[1].strip() if len(parts) == 2 else None
    try:
        report = await build_report(message.from_user.id, month=month)
    except TelegramApprovalError as exc:
        await message.answer(str(exc))
        return
    await message.answer(report.text, reply_markup=report.markup)


@dp.message(Command("me"))
async def cmd_me(message: Message) -> None:
    if message.from_user is None:
        return
    try:
        user = await get_linked_user(message.from_user.id)
    except TelegramApprovalError as exc:
        await message.answer(str(exc))
        return
    await message.answer(
        f"👤 {user.name or '—'}\n📞 {user.phone}\n🔐 {_role_label(user.role)}"
    )


@dp.message(Command("id"))
async def cmd_id(message: Message) -> None:
    await message.answer(f"Chat ID: {message.chat.id}")


@dp.message(Command("unlink"))
async def cmd_unlink(message: Message) -> None:
    if message.from_user is None:
        return
    unlinked = await unlink_telegram_account(message.from_user.id)
    await message.answer(
        "Telegram bog'lanishi uzildi" if unlinked else "Bog'langan hisob topilmadi"
    )


@dp.callback_query()
async def handle_approval_callback(callback: CallbackQuery) -> None:
    data = callback.data or ""
    if data.startswith("report:"):
        parts = data.split(":", maxsplit=2)
        if len(parts) != 3:
            await callback.answer("Noto'g'ri hisobot so'rovi", show_alert=True)
            return
        section, month = parts[1], parts[2]
        if section == "menu":
            try:
                user = await get_linked_user(callback.from_user.id)
            except TelegramApprovalError as exc:
                await callback.answer(str(exc), show_alert=True)
                return
            if user.role != UserRole.EMPLOYEE or callback.message is None:
                await callback.answer("Bu bo'lim faqat xodimlar uchun", show_alert=True)
                return
            today = datetime.now(ZoneInfo(settings.timezone)).date()
            await send_employee_menu(
                callback.bot,
                user_id=user.id,
                chat_id=callback.message.chat.id,
                target_date=today,
            )
            await callback.answer("Bugungi menyu yuborildi")
            return
        try:
            report = await build_report(
                callback.from_user.id, month=month, section=section
            )
        except TelegramApprovalError as exc:
            await callback.answer(str(exc), show_alert=True)
            return
        if callback.message:
            await callback.message.edit_text(report.text, reply_markup=report.markup)
        await callback.answer()
        return
    if data.startswith("connection:"):
        parts = data.split(":", maxsplit=2)
        if len(parts) != 3:
            await callback.answer("Noto'g'ri ulanish so'rovi", show_alert=True)
            return
        try:
            result = await process_connection_decision(
                telegram_user_id=callback.from_user.id,
                request_id=parts[2],
                approve=parts[1] == "approve",
            )
        except TelegramApprovalError as exc:
            await callback.answer(str(exc), show_alert=True)
            return
        await callback.answer(result)
        if callback.message:
            await callback.message.edit_text(
                f"{callback.message.text or 'So‘rov'}\n\n{result}"
            )
        return
    if not (data.startswith("approve:") or data.startswith("reject:")):
        return
    parts = data.split(":", maxsplit=2)
    if len(parts) != 3:
        await callback.answer("Noto'g'ri amal", show_alert=True)
        return
    approve = parts[0] == "approve"
    target_id = parts[2]
    try:
        result = await process_decision(
            telegram_user_id=callback.from_user.id,
            target_id=target_id,
            approve=approve,
            message_id=callback.message.message_id if callback.message else None,
        )
    except TelegramApprovalError as exc:
        await callback.answer(str(exc), show_alert=True)
        return
    await callback.answer(result)
    if callback.message:
        original = callback.message.text or "Ariza"
        await callback.message.edit_text(
            f"{original}\n\n{result}\n👤 {_role_label((await get_linked_user(callback.from_user.id)).role)}",
        )


async def main() -> None:
    if not bot_settings.bot_token:
        raise SystemExit("BOT_TOKEN .env da sozlanmagan")
    bot = Bot(token=bot_settings.bot_token)
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="LunchDrop hisobini bog'lash"),
            BotCommand(command="menu", description="Bugungi taomlar"),
            BotCommand(command="hisobot", description="Oylik qarz va buyurtmalar"),
            BotCommand(command="pending", description="Kutilayotgan arizalar"),
            BotCommand(command="me", description="Bog'langan hisobim"),
            BotCommand(command="unlink", description="Bog'lanishni uzish"),
            BotCommand(command="id", description="Telegram chat ID"),
        ]
    )
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
