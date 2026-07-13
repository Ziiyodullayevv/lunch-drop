from decimal import Decimal

from app.schemas.order import OrderRead, OrderMealItemRead


def test_order_meal_item_exposes_image_and_line_total() -> None:
    item = OrderMealItemRead(
        meal_id="meal-1",
        meal_name="Osh",
        meal_image_url="/media/meals/osh.png",
        quantity=3,
        historical_price=Decimal("25000.00"),
        line_total=Decimal("75000.00"),
    )

    assert item.meal_image_url == "/media/meals/osh.png"
    assert item.line_total == Decimal("75000.00")


def test_order_exposes_employee_contact_and_avatar_fields() -> None:
    properties = OrderRead.model_json_schema()["properties"]

    assert "employee_name" in properties
    assert "employee_phone" in properties
    assert "employee_avatar_url" in properties
