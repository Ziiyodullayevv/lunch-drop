"""Domen enumlari (TZ v4.0)."""

from enum import StrEnum


class UserRole(StrEnum):
    SUPER_ADMIN = "super_admin"
    KITCHEN_ADMIN = "kitchen_admin"
    COMPANY_ADMIN = "company_admin"
    EMPLOYEE = "employee"


class AccountStatus(StrEnum):
    """users.account_status — barcha rollar uchun umumiy tasdiqlash holati (v4.1).

    - Admin (kitchen/company): register → PENDING_APPROVAL → super_admin APPROVED/REJECTED.
    - Employee: OTP login (null) → join-branch → PENDING_APPROVAL → company_admin APPROVED.
    - INACTIVE: ishdan bo'shagan/bloklangan.
    - null = hali tasdiqlash konteksti yo'q (yangi employee).
    """

    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    INACTIVE = "inactive"


class ConnectionRequestStatus(StrEnum):
    """Kompaniya filiali → oshxona ulanish so'rovi holati."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class OrderStatus(StrEnum):
    """CREATED → PREPARING → ON_THE_WAY → DELIVERED (↘ CANCELLED)."""

    CREATED = "created"
    PREPARING = "preparing"
    ON_THE_WAY = "on_the_way"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# Buyurtma holatining o'zbekcha nomi (frontend to'g'ridan-to'g'ri ko'rsatadi).
ORDER_STATUS_LABELS: dict[OrderStatus, str] = {
    OrderStatus.CREATED: "Qabul qilindi",
    OrderStatus.PREPARING: "Tayyorlanmoqda",
    OrderStatus.ON_THE_WAY: "Yo'lda",
    OrderStatus.DELIVERED: "Yetkazildi",
    OrderStatus.CANCELLED: "Bekor qilindi",
}


class InvoiceStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
