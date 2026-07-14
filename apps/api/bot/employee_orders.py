"""Xodimning Telegram orqali savat tuzishi va buyurtmalarini boshqarishi."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from html import escape
from zoneinfo import ZoneInfo

from aiogram import Bot
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from sqlalchemy import select

from app.config import settings
from app.core.exceptions import AppException
from app.db.session import AsyncSessionLocal
from app.models.branch import Branch, EmployeeBranch
from app.models.enums import AccountStatus, UserRole
from app.models.kitchen import Kitchen
from app.models.telegram import TelegramOrderDraft
from app.models.user import User
from app.schemas.employee import OrderCreate, OrderItemCreate
from app.services.employee_service import EmployeeService
from bot.approvals import TelegramApprovalError, get_linked_user
from bot.order_status import format_order_status_message, order_actions_markup


class EmployeeOrderError(Exception):
    pass


def _price(value) -> str:
    return f"{value:,.0f}".replace(",", " ")


def _expires_at() -> datetime:
    return datetime.now(UTC) + timedelta(minutes=30)


async def _employee(telegram_user_id: int):
    try:
        user = await get_linked_user(telegram_user_id)
    except TelegramApprovalError as exc:
        raise EmployeeOrderError(str(exc)) from exc
    if (
        user.role != UserRole.EMPLOYEE
        or user.account_status != AccountStatus.APPROVED
        or not user.is_active
    ):
        raise EmployeeOrderError("Bu amal faqat tasdiqlangan xodim uchun")
    return user


async def _draft(session, user_id: str) -> TelegramOrderDraft:
    draft = (
        await session.execute(
            select(TelegramOrderDraft).where(TelegramOrderDraft.user_id == user_id)
        )
    ).scalar_one_or_none()
    if draft is None:
        draft = TelegramOrderDraft(user_id=user_id, items={}, expires_at=_expires_at())
        session.add(draft)
        await session.flush()
    else:
        expiry = draft.expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=UTC)
        if expiry < datetime.now(UTC):
            draft.target_date = None
            draft.branch_id = None
            draft.kitchen_id = None
            draft.items = {}
        draft.expires_at = _expires_at()
    return draft


async def start_order_flow(bot: Bot, telegram_user_id: int, chat_id: int) -> None:
    user = await _employee(telegram_user_id)
    async with AsyncSessionLocal() as session:
        draft = await _draft(session, user.id)
        draft.target_date = None
        draft.branch_id = None
        draft.kitchen_id = None
        draft.items = {}
        await session.commit()
    today = datetime.now(ZoneInfo(settings.timezone)).date()
    tomorrow = today + timedelta(days=1)
    await bot.send_message(
        chat_id,
        "📅 Buyurtma sanasini tanlang:",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"Bugun — {today.strftime('%d.%m')}",
                        callback_data="eo:date:0",
                    )
                ],
                [
                    InlineKeyboardButton(
                        text=f"Ertaga — {tomorrow.strftime('%d.%m')}",
                        callback_data="eo:date:1",
                    )
                ],
                [InlineKeyboardButton(text="Yopish", callback_data="eo:close")],
            ]
        ),
    )


async def _choose_branch(bot: Bot, chat_id: int, user_id: str) -> None:
    async with AsyncSessionLocal() as session:
        branches = list(
            (
                await session.execute(
                    select(Branch)
                    .join(EmployeeBranch, EmployeeBranch.branch_id == Branch.id)
                    .where(
                        EmployeeBranch.user_id == user_id,
                        Branch.deleted_at.is_(None),
                    )
                    .order_by(Branch.name)
                )
            ).scalars()
        )
        if not branches:
            raise EmployeeOrderError("Sizga biriktirilgan filial topilmadi")
        if len(branches) == 1:
            draft = await _draft(session, user_id)
            draft.branch_id = branches[0].id
            await session.commit()
            await _choose_kitchen(bot, chat_id, user_id)
            return
    await bot.send_message(
        chat_id,
        "🏢 Yetkaziladigan filialni tanlang:",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=branch.name, callback_data=f"eo:branch:{branch.id}"
                    )
                ]
                for branch in branches
            ]
        ),
    )


async def _menu_for_draft(session, user, draft):
    if user is None:
        raise EmployeeOrderError("Xodim topilmadi")
    if not draft.target_date or not draft.branch_id:
        raise EmployeeOrderError("Avval sana va filialni tanlang")
    try:
        return await EmployeeService(session, user).menu(
            draft.target_date, draft.branch_id
        )
    except AppException as exc:
        raise EmployeeOrderError(str(exc)) from exc


async def _choose_kitchen(bot: Bot, chat_id: int, user_id: str) -> None:
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        draft = await _draft(session, user_id)
        menu = await _menu_for_draft(session, user, draft)
        kitchen_ids = sorted({item.kitchen_id for item in menu.items})
        if not kitchen_ids:
            raise EmployeeOrderError("Tanlangan sana va filial uchun menyu topilmadi")
        kitchens = list(
            (
                await session.execute(
                    select(Kitchen).where(Kitchen.id.in_(kitchen_ids))
                )
            ).scalars()
        )
        if len(kitchens) == 1:
            draft.kitchen_id = kitchens[0].id
            draft.items = {}
            await session.commit()
            await _show_cart(bot, chat_id, user_id)
            return
    await bot.send_message(
        chat_id,
        "👨‍🍳 Oshxonani tanlang:",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=kitchen.name, callback_data=f"eo:kitchen:{kitchen.id}"
                    )
                ]
                for kitchen in sorted(kitchens, key=lambda row: row.name)
            ]
        ),
    )


async def _show_cart(
    bot: Bot, chat_id: int, user_id: str, *, message: Message | None = None
) -> None:
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        draft = await _draft(session, user_id)
        if not draft.kitchen_id:
            raise EmployeeOrderError("Avval oshxonani tanlang")
        menu = await _menu_for_draft(session, user, draft)
        meals = [item for item in menu.items if item.kitchen_id == draft.kitchen_id]
        valid_ids = {item.id for item in meals}
        items = {
            key: value
            for key, value in (draft.items or {}).items()
            if key in valid_ids and value > 0
        }
        draft.items = items
        await session.commit()
        total = sum(item.price * items.get(item.id, 0) for item in meals)
        selected = [
            f"• {escape(item.name)} ×{items[item.id]} — {_price(item.price * items[item.id])} so‘m"
            for item in meals
            if items.get(item.id)
        ]
        text = "<b>🛒 Savatingiz</b>\n\n" + (
            "\n".join(selected) if selected else "Hali taom tanlanmagan"
        )
        text += f"\n\n<b>Jami: {_price(total)} so‘m</b>"
        rows = []
        for item in meals:
            quantity = items.get(item.id, 0)
            rows.append(
                [
                    InlineKeyboardButton(text="−", callback_data=f"eo:minus:{item.id}"),
                    InlineKeyboardButton(
                        text=f"{quantity} · {item.name[:24]}", callback_data="eo:noop"
                    ),
                    InlineKeyboardButton(text="+", callback_data=f"eo:plus:{item.id}"),
                ]
            )
        if selected:
            rows.append(
                [
                    InlineKeyboardButton(
                        text="✅ Buyurtmani tasdiqlash", callback_data="eo:confirm"
                    )
                ]
            )
        rows.append(
            [InlineKeyboardButton(text="❌ Savatni yopish", callback_data="eo:close")]
        )
    markup = InlineKeyboardMarkup(inline_keyboard=rows)
    if message is not None:
        await message.edit_text(text, parse_mode="HTML", reply_markup=markup)
    else:
        await bot.send_message(chat_id, text, parse_mode="HTML", reply_markup=markup)


async def _set_quantity(user_id: str, meal_id: str, delta: int) -> None:
    async with AsyncSessionLocal() as session:
        draft = await _draft(session, user_id)
        items = dict(draft.items or {})
        quantity = max(0, min(20, items.get(meal_id, 0) + delta))
        if quantity:
            items[meal_id] = quantity
        else:
            items.pop(meal_id, None)
        draft.items = items
        await session.commit()


async def _confirm_order(user_id: str):
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        draft = (
            await session.execute(
                select(TelegramOrderDraft)
                .where(TelegramOrderDraft.user_id == user_id)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if draft is None:
            raise EmployeeOrderError("Savat topilmadi yoki allaqachon tasdiqlangan")
        expiry = draft.expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=UTC)
        if expiry < datetime.now(UTC):
            raise EmployeeOrderError("Savat muddati tugagan, qayta boshlang")
        if (
            not draft.target_date
            or not draft.branch_id
            or not draft.kitchen_id
            or not draft.items
        ):
            raise EmployeeOrderError("Savat to‘liq emas")
        try:
            order = await EmployeeService(session, user).create_order(
                OrderCreate(
                    branch_id=draft.branch_id,
                    kitchen_id=draft.kitchen_id,
                    target_date=draft.target_date,
                    items=[
                        OrderItemCreate(meal_id=meal_id, quantity=quantity)
                        for meal_id, quantity in draft.items.items()
                    ],
                ),
                commit=False,
            )
        except AppException as exc:
            raise EmployeeOrderError(str(exc)) from exc
        await session.delete(draft)
        await session.commit()
        return order


async def send_recent_orders(bot: Bot, telegram_user_id: int, chat_id: int) -> None:
    user = await _employee(telegram_user_id)
    async with AsyncSessionLocal() as session:
        rows, _ = await EmployeeService(session, user).list_orders(
            None, None, None, 10, 0
        )
    if not rows:
        await bot.send_message(chat_id, "Sizda hali buyurtmalar yo‘q")
        return
    await bot.send_message(chat_id, "🧾 So‘nggi buyurtmalaringiz:")
    for order in rows:
        await bot.send_message(
            chat_id,
            format_order_status_message(order, order.status),
            parse_mode="HTML",
            reply_markup=order_actions_markup(order.id, order.status),
        )


async def handle_employee_order_callback(callback: CallbackQuery) -> bool:
    data = callback.data or ""
    if not data.startswith("eo:"):
        return False
    if callback.message is None:
        await callback.answer()
        return True
    try:
        user = await _employee(callback.from_user.id)
        chat_id = callback.message.chat.id
        if data == "eo:start":
            await start_order_flow(callback.bot, callback.from_user.id, chat_id)
        elif data == "eo:close":
            async with AsyncSessionLocal() as session:
                draft = await session.scalar(
                    select(TelegramOrderDraft).where(
                        TelegramOrderDraft.user_id == user.id
                    )
                )
                if draft:
                    await session.delete(draft)
                    await session.commit()
            await callback.message.edit_reply_markup(reply_markup=None)
        elif data == "eo:noop":
            pass
        elif data.startswith("eo:date:"):
            offset = int(data.rsplit(":", 1)[1])
            if offset not in (0, 1):
                raise EmployeeOrderError(
                    "Faqat bugun yoki ertaga buyurtma berish mumkin"
                )
            async with AsyncSessionLocal() as session:
                draft = await _draft(session, user.id)
                draft.target_date = datetime.now(
                    ZoneInfo(settings.timezone)
                ).date() + timedelta(days=offset)
                await session.commit()
            await _choose_branch(callback.bot, chat_id, user.id)
        elif data.startswith("eo:branch:"):
            branch_id = data.removeprefix("eo:branch:")
            async with AsyncSessionLocal() as session:
                allowed = await session.scalar(
                    select(EmployeeBranch).where(
                        EmployeeBranch.user_id == user.id,
                        EmployeeBranch.branch_id == branch_id,
                    )
                )
                if allowed is None:
                    raise EmployeeOrderError("Bu filial sizga tegishli emas")
                draft = await _draft(session, user.id)
                draft.branch_id = branch_id
                draft.kitchen_id = None
                draft.items = {}
                await session.commit()
            await _choose_kitchen(callback.bot, chat_id, user.id)
        elif data.startswith("eo:kitchen:"):
            async with AsyncSessionLocal() as session:
                draft = await _draft(session, user.id)
                kitchen_id = data.removeprefix("eo:kitchen:")
                user_db = await session.get(User, user.id)
                menu = await _menu_for_draft(session, user_db, draft)
                if kitchen_id not in {item.kitchen_id for item in menu.items}:
                    raise EmployeeOrderError("Bu oshxona tanlangan menyuda mavjud emas")
                draft.kitchen_id = kitchen_id
                draft.items = {}
                await session.commit()
            await _show_cart(callback.bot, chat_id, user.id)
        elif data.startswith("eo:plus:") or data.startswith("eo:minus:"):
            plus = data.startswith("eo:plus:")
            meal_id = data.split(":", 2)[2]
            await _set_quantity(user.id, meal_id, 1 if plus else -1)
            await _show_cart(callback.bot, chat_id, user.id, message=callback.message)
        elif data == "eo:confirm":
            order = await _confirm_order(user.id)
            await callback.message.edit_reply_markup(reply_markup=None)
            await callback.bot.send_message(
                chat_id,
                "✅ Buyurtmangiz qabul qilindi. Jarayon holatlari shu yerga yuboriladi.\n"
                f"💰 Jami: {_price(order.historical_price)} so‘m",
            )
        elif data.startswith("eo:view:"):
            order_id = data.removeprefix("eo:view:")
            async with AsyncSessionLocal() as session:
                order = await EmployeeService(session, user).get_order_detail(order_id)
            await callback.bot.send_message(
                chat_id,
                format_order_status_message(order, order.status),
                parse_mode="HTML",
                reply_markup=order_actions_markup(order.id, order.status),
            )
        elif data.startswith("eo:cancelorder:"):
            order_id = data.removeprefix("eo:cancelorder:")
            async with AsyncSessionLocal() as session:
                await EmployeeService(session, user).cancel_order(order_id)
            await callback.message.edit_reply_markup(reply_markup=None)
            await callback.bot.send_message(chat_id, "❌ Buyurtma bekor qilindi")
        elif data.startswith("eo:confirmdelivery:"):
            order_id = data.removeprefix("eo:confirmdelivery:")
            async with AsyncSessionLocal() as session:
                await EmployeeService(session, user).confirm_delivery(order_id)
            await callback.message.edit_reply_markup(reply_markup=None)
            await callback.bot.send_message(chat_id, "✅ Yetkazib berish tasdiqlandi")
        else:
            return False
        await callback.answer()
    except (EmployeeOrderError, AppException, ValueError) as exc:
        await callback.answer(str(exc), show_alert=True)
    return True
