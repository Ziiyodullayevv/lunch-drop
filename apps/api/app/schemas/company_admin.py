"""Company Admin schemalar."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import AccountStatus, InvoiceStatus


class PendingEmployeeRead(BaseModel):
    id: str
    phone: str
    name: str | None
    branches: list[str]  # xodim a'zo bo'lmoqchi bo'lgan filial nomlari
    account_status: AccountStatus | None
    created_at: datetime


class EmployeeStatusUpdate(BaseModel):
    status: AccountStatus

    @field_validator("status")
    @classmethod
    def _allowed(cls, v: AccountStatus) -> AccountStatus:
        if v not in (
            AccountStatus.APPROVED,
            AccountStatus.REJECTED,
            AccountStatus.INACTIVE,
        ):
            raise ValueError("Faqat APPROVED, REJECTED yoki INACTIVE")
        return v


class BulkConfirmResponse(BaseModel):
    confirmed: int


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    period_start: date
    period_end: date
    total_company_expense: Decimal
    total_system_fee: Decimal
    total_kitchen_profit: Decimal
    status: InvoiceStatus
    created_at: datetime
