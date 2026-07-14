import asyncio
from datetime import date
from decimal import Decimal

from app.models.enums import OrderStatus
from app.services.dashboard import (
    company_admin_analytics,
    kitchen_admin_analytics,
    menu_items_today_card,
    net_revenue_card,
    period_month,
    revenue_card,
    super_admin_analytics,
    system_fee_card,
)


class _Result:
    def __init__(self, *, rows=None, scalar=None):
        self._rows = rows or []
        self._scalar = scalar

    def all(self):
        return self._rows

    def scalar_one(self):
        return self._scalar


class _ScalarsResult:
    def __init__(self, values):
        self._values = values

    def scalars(self):
        return self

    def all(self):
        return self._values


class _FeeSession:
    def __init__(self):
        self._results = [
            _Result(rows=[(date(2026, 7, 13), Decimal("300")), (date(2026, 7, 14), Decimal("600"))]),
            _Result(scalar=Decimal("900")),
            _Result(scalar=Decimal("500")),
        ]

    async def execute(self, _statement):
        return self._results.pop(0)


class _AnalyticsSession:
    def __init__(self):
        self._results = [
            _Result(rows=[(1, Decimal("300")), (7, Decimal("900"))]),
            _Result(
                rows=[
                    ("company-1", "Atlas", 12, Decimal("30000"), Decimal("900")),
                    ("company-2", "Orzu", 7, Decimal("21000"), Decimal("630")),
                    ("company-3", "Zarafshon", 3, Decimal("9000"), Decimal("270")),
                    ("company-4", "Samarqand", 2, Decimal("6000"), Decimal("180")),
                    ("company-5", "Buxoro", 1, Decimal("3000"), Decimal("90")),
                ]
            ),
        ]

    async def execute(self, _statement):
        return self._results.pop(0)


def test_monthly_system_fee_card_uses_delivered_fee_totals() -> None:
    today = date(2026, 7, 14)

    card = asyncio.run(
        system_fee_card(
            _FeeSession(), [], False, "monthly_system_fee", today, period_month(today)
        )
    )

    assert card.key == "monthly_system_fee"
    assert card.value == 900
    assert card.trend_percent == 80.0
    assert card.history[-1].value == 600


def test_monthly_company_revenue_card_uses_delivered_order_totals() -> None:
    today = date(2026, 7, 14)
    card = asyncio.run(
        revenue_card(
            _FeeSession(), [], False, "monthly_total_revenue", today, period_month(today)
        )
    )

    assert card.key == "monthly_total_revenue"
    assert card.value == 900
    assert card.trend_percent == 80.0
    assert len(card.history) == 8


def test_super_admin_analytics_returns_monthly_fee_and_top_five_companies() -> None:
    analytics = asyncio.run(super_admin_analytics(_AnalyticsSession(), date(2026, 7, 14), 2026))

    assert analytics.monthly_system_fee.values[0] == 300
    assert analytics.monthly_system_fee.values[6] == 900
    assert len(analytics.top_companies) == 5
    assert analytics.top_companies[0].company_name == "Atlas"
    assert analytics.top_companies[0].system_fee == 900


class _CompanyAnalyticsSession:
    def __init__(self):
        self._results = [
            _Result(rows=[(date(2026, 7, 12), 2), (date(2026, 7, 14), 5)]),
            _Result(rows=[(7, Decimal("56000"))]),
        ]

    async def execute(self, _statement):
        return self._results.pop(0)


def test_company_analytics_returns_weekly_unique_lunch_activity_and_monthly_cost() -> None:
    analytics = asyncio.run(
        company_admin_analytics(_CompanyAnalyticsSession(), "company-1", date(2026, 7, 14), 2026)
    )

    assert len(analytics.lunch_activity) == 7
    assert analytics.lunch_activity[4].value == 2
    assert analytics.lunch_activity[-1].value == 5
    assert analytics.monthly_cost.values[6] == 56_000


class _KitchenAnalyticsSession:
    def __init__(self):
        self._results = [
            _Result(rows=[(OrderStatus.CREATED, 2), (OrderStatus.DELIVERED, 4)]),
            _Result(rows=[(7, Decimal("97000"))]),
        ]

    async def execute(self, _statement):
        return self._results.pop(0)


def test_kitchen_analytics_returns_today_statuses_and_monthly_net_revenue() -> None:
    analytics = asyncio.run(
        kitchen_admin_analytics(_KitchenAnalyticsSession(), "kitchen-1", date(2026, 7, 14), 2026)
    )

    assert analytics.today_order_statuses.created == 2
    assert analytics.today_order_statuses.delivered == 4
    assert analytics.today_order_statuses.cancelled == 0
    assert analytics.monthly_net_revenue.values[6] == 97_000


class _NetRevenueSession:
    def __init__(self):
        self._results = [
            _Result(rows=[(date(2026, 7, 13), Decimal("9700")), (date(2026, 7, 14), Decimal("19400"))]),
            _Result(scalar=Decimal("29100")),
            _Result(scalar=Decimal("9700")),
        ]

    async def execute(self, _statement):
        return self._results.pop(0)


def test_weekly_net_revenue_excludes_the_system_fee() -> None:
    today = date(2026, 7, 14)
    card = asyncio.run(
        net_revenue_card(
            _NetRevenueSession(), [], False, "weekly_net_revenue", today, period_month(today)
        )
    )

    assert card.value == 29_100
    assert card.history[-1].value == 19_400


class _MenuSession:
    def __init__(self):
        self.calls = 0

    async def execute(self, _statement):
        self.calls += 1
        return _ScalarsResult(["meal-1", "meal-1", "meal-2"])


def test_today_menu_card_uses_specific_date_menu_without_weekly_fallback() -> None:
    session = _MenuSession()
    card = asyncio.run(menu_items_today_card(session, "kitchen-1", date(2026, 7, 14)))

    assert card.value == 2
    assert session.calls == 1
