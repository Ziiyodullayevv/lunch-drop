"""ORM modellari (TZ v4.0). Bu yerdan import barcha modellarni bitta `Base`
registriga yuklaydi (Alembic autogenerate va relationship resolyutsiyasi uchun).
"""

from app.models.branch import Branch, EmployeeBranch
from app.models.company import Company
from app.models.enums import (
    AccountStatus,
    ConnectionRequestStatus,
    InvoiceStatus,
    OrderStatus,
    UserRole,
)
from app.models.invoice import (
    Invoice,
    InvoiceBranchSummary,
    InvoiceEmployeeSummary,
    EmployeeMonthlyPayment,
)
from app.models.kitchen import BranchKitchen, Kitchen
from app.models.kitchen_connection import KitchenConnectionRequest
from app.models.meal import Meal, MenuCategory, MenuSchedule
from app.models.notification import Notification
from app.models.order import Order, OrderItem
from app.models.otp_code import OtpCode
from app.models.refresh_token import RefreshToken
from app.models.telegram import (
    ApprovalAction,
    EmployeeDeliveryNotice,
    TelegramAccount,
    TelegramDeliveryPrompt,
    TelegramKitchenOrderSummaryDelivery,
    TelegramMenuDelivery,
    TelegramOrderDraft,
    TelegramOrderStatusOutbox,
)
from app.models.user import User

__all__ = [
    "AccountStatus",
    "ApprovalAction",
    "BranchKitchen",
    "Branch",
    "Company",
    "ConnectionRequestStatus",
    "EmployeeBranch",
    "EmployeeDeliveryNotice",
    "Invoice",
    "InvoiceBranchSummary",
    "InvoiceEmployeeSummary",
    "EmployeeMonthlyPayment",
    "InvoiceStatus",
    "Kitchen",
    "KitchenConnectionRequest",
    "Meal",
    "MenuCategory",
    "MenuSchedule",
    "Notification",
    "Order",
    "OrderItem",
    "OrderStatus",
    "OtpCode",
    "RefreshToken",
    "TelegramAccount",
    "TelegramDeliveryPrompt",
    "TelegramKitchenOrderSummaryDelivery",
    "TelegramMenuDelivery",
    "TelegramOrderDraft",
    "TelegramOrderStatusOutbox",
    "User",
    "UserRole",
]
