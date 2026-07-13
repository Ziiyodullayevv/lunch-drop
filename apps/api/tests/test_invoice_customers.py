from datetime import date
from decimal import Decimal

from app.models.invoice import EmployeeMonthlyPayment
from app.models.enums import InvoiceStatus
from app.schemas.company_admin import InvoiceCustomerRead, InvoiceCustomerStatusUpdate


def test_employee_payment_is_unique_for_company_employee_and_month() -> None:
    constraints = {
        constraint.name for constraint in EmployeeMonthlyPayment.__table__.constraints
    }

    assert "uq_employee_monthly_payment" in constraints


def test_invoice_customer_exposes_monthly_order_total_and_status() -> None:
    customer = InvoiceCustomerRead(
        company_id="company-1",
        company_name="Mars IT",
        employee_id="employee-1",
        employee_name="Akobir Ziyodullayev",
        employee_phone="+998901234567",
        employee_avatar_url=None,
        branch_names=["Chilonzor filiali"],
        period_month=date(2026, 7, 1),
        order_count=8,
        total_amount=Decimal("240000"),
        status=InvoiceStatus.PENDING,
    )

    assert customer.order_count == 8
    assert customer.total_amount == Decimal("240000")
    assert InvoiceCustomerStatusUpdate(status="paid").status == InvoiceStatus.PAID
