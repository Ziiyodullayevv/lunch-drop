from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SettlementPaymentCreate(BaseModel):
    company_id: str
    period_month: date
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    paid_at: date
    payment_method: str | None = Field(default=None, max_length=40)
    transaction_reference: str | None = Field(default=None, max_length=255)
    note: str | None = Field(default=None, max_length=2000)
    receipt_url: str | None = Field(default=None, max_length=512)


class SettlementPaymentUpdate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    paid_at: date
    payment_method: str | None = Field(default=None, max_length=40)
    transaction_reference: str | None = Field(default=None, max_length=255)
    note: str | None = Field(default=None, max_length=2000)
    receipt_url: str | None = Field(default=None, max_length=512)


class SettlementPaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    period_month: date
    amount: Decimal
    paid_at: date
    payment_method: str | None
    transaction_reference: str | None
    note: str | None
    receipt_url: str | None
    created_by_user_id: str
    created_at: datetime
    updated_at: datetime


class SettlementBranchRead(BaseModel):
    branch_id: str
    branch_name: str
    orders_count: int
    gross_amount: Decimal
    system_fee: Decimal
    kitchen_receivable: Decimal


class SettlementCompanyRead(BaseModel):
    company_id: str
    company_name: str
    billing_day: int
    orders_count: int
    gross_amount: Decimal
    system_fee: Decimal
    kitchen_receivable: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    status: str
    branches: list[SettlementBranchRead]
    payments: list[SettlementPaymentRead]
