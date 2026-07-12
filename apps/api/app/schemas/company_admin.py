"""Company Admin schemalar."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

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


class BranchOrderSummary(BaseModel):
    branch_id: str
    branch_name: str
    order_count: int
    total_amount: Decimal
    pending_count: int


class EmployeeOrderSummary(BaseModel):
    employee_id: str
    employee_name: str | None
    branch_id: str
    branch_name: str
    order_count: int
    total_amount: Decimal
    delivered_count: int


class OrderReportResponse(BaseModel):
    period_start: date
    period_end: date
    branches: list[BranchOrderSummary]
    employees: list[EmployeeOrderSummary]
    total_orders: int
    total_amount: Decimal


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
    branch_summaries: list[BranchOrderSummary] = Field(default_factory=list)
    employee_summaries: list[EmployeeOrderSummary] = Field(default_factory=list)
