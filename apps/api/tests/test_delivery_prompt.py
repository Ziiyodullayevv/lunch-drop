from datetime import date
from decimal import Decimal

from bot.delivery import delivery_prompt_markup, format_delivery_prompt
from bot.orders import KitchenOrderSummary


def test_delivery_prompt_is_scoped_to_one_branch() -> None:
    text = format_delivery_prompt(
        KitchenOrderSummary(
            kitchen_name="LunchDrop Kitchen",
            company_name="Mars IT",
            branch_id="branch-1",
            branch_name="Chilonzor filiali",
            target_date=date(2026, 7, 13),
            cutoff_time="10:30",
            order_count=4,
            portion_count=9,
            total_amount=Decimal("207000"),
            meals=(),
            customers=(),
        )
    )

    assert "<b>🚚 Yetkazish vaqti keldi</b>" in text
    assert "<b>Kompaniya:</b> Mars IT" in text
    assert "<b>Filial:</b> Chilonzor filiali" in text
    assert "yo'lga chiqaramizmi?" in text


def test_delivery_prompt_callback_fits_telegram_limit() -> None:
    prompt_id = "12345678-1234-1234-1234-123456789012"
    callback_data = delivery_prompt_markup(prompt_id).inline_keyboard[0][0].callback_data

    assert callback_data == f"delivery:confirm:{prompt_id}"
    assert len(callback_data.encode()) <= 64


def test_delivered_confirmation_prompt() -> None:
    summary = KitchenOrderSummary(
        kitchen_name="LunchDrop Kitchen",
        company_name="Mars IT",
        branch_id="branch-1",
        branch_name="Chilonzor filiali",
        target_date=date(2026, 7, 13),
        cutoff_time="10:30",
        order_count=4,
        portion_count=9,
        total_amount=Decimal("207000"),
        meals=(),
        customers=(),
    )

    text = format_delivery_prompt(summary, action="delivered")
    markup = delivery_prompt_markup("prompt-id", action="delivered")

    assert "<b>✅ Yetkazish vaqti tugadi</b>" in text
    assert "buyurtmalari yetkazildimi?" in text
    assert markup.inline_keyboard[0][0].text == "✅ Ha, yetkazildi"
