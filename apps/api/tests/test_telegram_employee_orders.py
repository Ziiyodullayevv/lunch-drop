from datetime import date, time
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.enums import OrderStatus
from app.models.telegram import TelegramOrderDraft, TelegramOrderStatusOutbox
from bot.menu import send_menu_response
from bot.order_status import format_order_status_message, order_actions_markup


class FakeBot:
    def __init__(self):
        self.photos = []
        self.messages = []

    async def send_photo(self, chat_id, photo, **kwargs):
        self.photos.append((chat_id, photo, kwargs))

    async def send_message(self, chat_id, text, **kwargs):
        self.messages.append((chat_id, text, kwargs))


def _menu(count: int, *, images: bool = True):
    return SimpleNamespace(
        items=[
            SimpleNamespace(
                id=f"meal-{index}",
                name=f"Taom {index}",
                kitchen_name="Test oshxona",
                price=Decimal("25000"),
                image_url=f"https://example.com/{index}.jpg" if images else None,
                order_cutoff_time=time(10, 30),
                delivery_start_time=time(12, 0),
                delivery_end_time=time(13, 0),
            )
            for index in range(count)
        ]
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("count", [1, 6, 10, 11])
async def test_menu_with_images_is_sent_as_one_photo_message(count):
    bot = FakeBot()
    sent = await send_menu_response(
        bot, chat_id=7, target_date=date(2026, 7, 14), menu=_menu(count)
    )

    assert sent == count
    assert len(bot.photos) == 1
    assert not bot.messages
    _, photo, kwargs = bot.photos[0]
    assert photo == "https://example.com/0.jpg"
    assert "1. Taom 0" in kwargs["caption"]
    assert "Buyurtma berish" == kwargs["reply_markup"].inline_keyboard[0][0].text.removeprefix("🛒 ")


@pytest.mark.asyncio
async def test_menu_without_images_still_has_single_action_message():
    bot = FakeBot()
    await send_menu_response(
        bot, chat_id=7, target_date=date(2026, 7, 14), menu=_menu(6, images=False)
    )
    assert not bot.photos
    assert len(bot.messages) == 1
    assert "1. Taom 0" in bot.messages[0][1]


def test_order_status_message_and_actions_are_status_scoped():
    order = SimpleNamespace(
        id="order-1",
        items=[SimpleNamespace(meal_name="Osh", quantity=2)],
        meal_name="Osh",
        branch_name="Chilonzor",
        target_date=date(2026, 7, 14),
        historical_price=Decimal("50000"),
    )
    text = format_order_status_message(order, OrderStatus.ON_THE_WAY)
    markup = order_actions_markup(order.id, OrderStatus.ON_THE_WAY)
    assert "Yo'lda" in text
    assert "Osh ×2" in text
    assert markup.inline_keyboard[-1][0].text == "✅ Yetib keldi"


def test_telegram_order_tables_have_idempotency_constraints():
    assert TelegramOrderDraft.__table__.c.user_id.unique is True
    constraints = {
        tuple(column.name for column in constraint.columns)
        for constraint in TelegramOrderStatusOutbox.__table__.constraints
        if hasattr(constraint, "columns")
    }
    assert ("order_id", "status") in constraints
