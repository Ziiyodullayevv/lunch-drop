from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import ConnectionRequestStatus


class KitchenConnectionCreate(BaseModel):
    kitchen_id: str


class KitchenConnectionRead(BaseModel):
    id: str
    company_id: str
    company_name: str
    branch_id: str
    branch_name: str
    kitchen_id: str
    kitchen_name: str
    status: ConnectionRequestStatus
    created_at: datetime
    reviewed_at: datetime | None = None


class KitchenPartnerReport(BaseModel):
    company_id: str
    company_name: str
    branch_id: str
    branch_name: str
    billing_day: int
    orders_count: int
    gross_amount: Decimal
    system_fee: Decimal
    kitchen_receivable: Decimal
