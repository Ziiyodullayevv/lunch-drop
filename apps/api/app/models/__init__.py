"""ORM modellari (TZ v4.0). Bu yerdan import barcha modellarni bitta `Base`
registriga yuklaydi (Alembic autogenerate va relationship resolyutsiyasi uchun).
"""

from app.models.branch import Branch, EmployeeBranch
from app.models.company import Company
from app.models.enums import (
    AccountStatus,
    InvoiceStatus,
    OrderStatus,
    UserRole,
)
from app.models.invoice import Invoice
from app.models.kitchen import BranchKitchen, Kitchen
from app.models.meal import Meal, MenuCategory, MenuSchedule
from app.models.notification import Notification
from app.models.order import Order
from app.models.otp_code import OtpCode
from app.models.refresh_token import RefreshToken
from app.models.telegram import ApprovalAction, TelegramAccount, TelegramMenuDelivery
from app.models.user import User

__all__ = [
    "AccountStatus",
    "ApprovalAction",
    "BranchKitchen",
    "Branch",
    "Company",
    "EmployeeBranch",
    "Invoice",
    "InvoiceStatus",
    "Kitchen",
    "Meal",
    "MenuCategory",
    "MenuSchedule",
    "Notification",
    "Order",
    "OrderStatus",
    "OtpCode",
    "RefreshToken",
    "TelegramAccount",
    "TelegramMenuDelivery",
    "User",
    "UserRole",
]
