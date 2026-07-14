import asyncio
from datetime import date
from decimal import Decimal

from app.services.dashboard import period_month, system_fee_card
from app.services.super_admin_service import SuperAdminService


class _Result:
    def __init__(self, *, rows=None, scalar=None):
        self._rows = rows or []
        self._scalar = scalar

    def all(self):
        return self._rows

    def scalar_one(self):
        return self._scalar


class _FeeSession:
    def __init__(self):
        self._results = [
            _Result(rows=[(date(2026, 7, 13), Decimal("300")), (date(2026, 7, 14), Decimal("600"))]),
            _Result(scalar=Decimal("900")),
            _Result(scalar=Decimal("500")),
        ]

    async def execute(self, _statement):
        return self._results.pop(0)


class _PendingSession:
    async def scalar(self, _statement):
        return 2


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


def test_pending_admin_approvals_card_has_no_comparison_trend() -> None:
    today = date(2026, 7, 14)

    card = asyncio.run(SuperAdminService(_PendingSession())._pending_admin_approvals_card(today))

    assert card.key == "pending_admin_approvals"
    assert card.value == 2
    assert card.trend_percent is None
    assert len(card.history) == 8
