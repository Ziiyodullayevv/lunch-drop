from datetime import date
from decimal import Decimal

from bot.orders import (
    CustomerOrderSummary,
    KitchenOrderSummary,
    format_kitchen_order_summary,
)


def test_format_kitchen_order_summary_contains_aggregates() -> None:
    text = format_kitchen_order_summary(
        KitchenOrderSummary(
            kitchen_name="Mars IT Kitchen",
            company_name="Mars IT",
            branch_id="branch-1",
            branch_name="Chilonzor filiali",
            target_date=date(2026, 7, 13),
            cutoff_time="10:30",
            order_count=3,
            portion_count=6,
            total_amount=Decimal("122000"),
            meals=(("Osh", 4, Decimal("88000")), ("Kompot", 2, Decimal("34000"))),
            customers=(
                CustomerOrderSummary(
                    name="Akobir Ziyodullayev",
                    phone="+998 99 547 62 02",
                    items=(("Kompot", 2), ("Osh", 4)),
                    total_amount=Decimal("122000"),
                ),
            ),
        )
    )

    assert "<b>Qabul yopildi:</b> 10:30" in text
    assert "<b>Kompaniya:</b> Mars IT" in text
    assert "<b>Filial:</b> Chilonzor filiali" in text
    assert "<b>Buyurtmalar:</b> 3 ta" in text
    assert "<b>Porsiyalar:</b> 6 ta" in text
    assert "<b>Jami:</b> 122 000 so'm" in text
    assert "<i>Osh</i> — <b>4 ta</b> (88 000 so'm)" in text
    assert "<b>Akobir Ziyodullayev</b> — +998 99 547 62 02" in text
    assert "<i>Kompot ×2, Osh ×4</i> — <b>122 000 so'm</b>" in text
