from datetime import date

from bot.employee_delivery import (
    EmployeeDeliverySummary,
    format_employee_delivery_notice,
)


def test_employee_delivery_notice_format() -> None:
    text = format_employee_delivery_notice(
        EmployeeDeliverySummary(
            kitchen_id="kitchen-1",
            kitchen_name="LunchDrop Kitchen",
            company_name="Mars IT",
            branch_id="branch-1",
            branch_name="Chilonzor filiali",
            user_id="user-1",
            target_date=date(2026, 7, 13),
            order_count=2,
            portion_count=4,
            meals=(("Kompot", 1), ("Osh", 3)),
        )
    )

    assert "<b>🚚 Yetkazish vaqti tugadi</b>" in text
    assert "<b>Kompaniya:</b> Mars IT" in text
    assert "<b>Filial:</b> Chilonzor filiali" in text
    assert "<i>Kompot ×1, Osh ×3</i>" in text
    assert "yetib kelganini tekshiring" in text
