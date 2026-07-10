"""LunchDrop'ning yagona interaktiv Telegram approval boti."""

import asyncio

from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import (
    CallbackQuery,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)

from app.models.enums import UserRole
from bot.approvals import (
    TelegramApprovalError,
    get_linked_user,
    link_telegram_account,
    pending_cards_for,
    process_decision,
    unlink_telegram_account,
)
from bot.config import bot_settings
from bot.notifier import approval_markup

dp = Dispatcher()


def _role_label(role: UserRole) -> str:
    return {
        UserRole.SUPER_ADMIN: "Super Admin",
        UserRole.COMPANY_ADMIN: "Company Admin",
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
            "Raqam tasdiqlangan Super Admin yoki Company Admin hisobiga mos bo'lishi kerak.",
            reply_markup=keyboard,
        )
        return
    await message.answer(
        f"✅ Hisob bog'langan\n👤 {user.name or '—'}\n🔐 {_role_label(user.role)}\n\n"
        "Yangi ariza kelganda bot avtomatik xabar yuboradi. /pending orqali "
        "kutilayotgan arizalarni qayta ko'rishingiz mumkin.",
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
    await _send_pending(message)


@dp.message(Command("pending"))
async def cmd_pending(message: Message) -> None:
    await _send_pending(message)


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
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
