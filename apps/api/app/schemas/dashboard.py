"""Dashboard analytics response modellari — type-safe OpenAPI kontrakt (uchala rol).

Pul qiymatlari (revenue_total, monthly_cost, weekly_revenue) — **UZS** (butun son),
yetkazilgan (delivered) buyurtmalarning historical_price yig'indisi.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

# Barcha rollardagi mumkin bo'lgan summary kartalar (role bo'yicha quyida izohlangan).
SummaryKey = Literal[
    # umumiy / order
    "orders_today",
    "delivered_today",
    "cancelled_today",
    # super_admin
    "orders_total",
    "revenue_total",        # UZS
    "monthly_system_fee",   # UZS, delivered buyurtmalardan platformaning 3% ulushi
    "pending_admin_approvals",
    "active_companies",
    "companies_total",
    "active_kitchens",
    # company_admin
    "lunch_subscribers_today",
    "monthly_cost",         # UZS
    "delivered_total",
    "branches_total",
    "active_employees",
    # kitchen_admin
    "portions_today",
    "weekly_revenue",       # UZS
    "connected_companies",
]


class HistoryPoint(BaseModel):
    date: date
    value: int


class SummaryCard(BaseModel):
    key: SummaryKey
    value: int = Field(ge=0)  # manfiy bo'lmaydi; pul kartalarida UZS
    # joriy davr oldingi teng davrga nisbatan (%). Oldingi 0 bo'lsa null.
    trend_percent: float | None
    history: list[HistoryPoint] = Field(min_length=8, max_length=8)  # bugun bilan 8 kun


class OrderStatusTotals(BaseModel):
    """Yil bo'yicha barcha statuslar (bo'lmagan status ham 0). delivered/cancelled majburiy."""

    created: int
    preparing: int
    on_the_way: int
    delivered: int
    cancelled: int


class MonthlyOrders(BaseModel):
    year: int
    delivered: list[int] = Field(min_length=12, max_length=12)  # yanvar..dekabr
    cancelled: list[int] = Field(min_length=12, max_length=12)


class DashboardResponse(BaseModel):
    year: int
    timezone: Literal["Asia/Tashkent"]
    generated_at: datetime
    summary: list[SummaryCard]
    order_status_totals: OrderStatusTotals
    monthly_orders: MonthlyOrders
