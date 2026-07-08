"""Order schemalar."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import OrderStatus


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    kitchen_id: str
    meal_id: str
    target_date: date
    historical_price: Decimal
    system_fee: Decimal
    status: OrderStatus
    created_at: datetime

    # Boyitilgan maydonlar (servisda to'ldiriladi)
    employee_name: str | None = None
    branch_id: str | None = None
    branch_name: str | None = None
    company_id: str | None = None
    company_name: str | None = None
    kitchen_name: str | None = None
    meal_name: str | None = None
