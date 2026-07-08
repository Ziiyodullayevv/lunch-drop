"""LunchDrop Telegram bot (aiogram 3) — interaktiv qism.

Ishga tushirish:  python -m bot.main
Maqsad: admin'lar chat ID'sini bilib olishi (/id) va botni "start" qilishi
(Telegram qoidasi: bot avval foydalanuvchiga yoza olishi uchun foydalanuvchi
botga /start bosgan bo'lishi shart).

Eslatma: OTP yuborish uchun bu jarayon DOIM ishlashi shart EMAS — API
`bot.notifier` orqali to'g'ridan-to'g'ri yuboradi.
"""

import asyncio

from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import Message

from bot.config import bot_settings

dp = Dispatcher()


@dp.message(Command("start"))
async def cmd_start(message: Message) -> None:
    await message.answer(
        "Salom! Bu LunchDrop xizmat boti.\n"
        f"Sizning chat ID: {message.chat.id}\n\n"
        "Bu ID'ni .env dagi OTP_NOTIFY_CHAT_IDS ga qo'shing.",
    )


@dp.message(Command("id"))
async def cmd_id(message: Message) -> None:
    await message.answer(f"Chat ID: {message.chat.id}")


async def main() -> None:
    if not bot_settings.bot_token:
        raise SystemExit("BOT_TOKEN .env da sozlanmagan")
    bot = Bot(token=bot_settings.bot_token)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
