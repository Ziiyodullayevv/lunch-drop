"""Role-based dashboard analytics — umumiy aggregate SQL helperlar.

Uchala dashboard (super/company/kitchen) bir xil `DashboardResponse` qaytaradi.
Scope har rolga xos `order_where` (+ kerak bo'lsa User join) orqali beriladi.
Hisoblashlar Asia/Tashkent; pagination yo'q (faqat aggregate).

trend_percent (ikkala tur uchun ham): (history[-1] - history[0]) / history[0] * 100.
- order kartalari: history = kunlik son → bugun vs 7 kun oldingi shu kun.
- snapshot kartalari: history = o'sha kungacha jami (cumulative) → joriy vs 7d oldingi snapshot.
"""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import Date, cast, distinct, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.branch import Branch
from app.models.enums import OrderStatus
from app.models.kitchen import BranchKitchen
from app.models.order import Order
from app.models.user import User
from app.schemas.dashboard import (
    DashboardResponse,
    HistoryPoint,
    MonthlyOrders,
    OrderStatusTotals,
    SummaryCard,
)

_TZ = ZoneInfo(settings.timezone)

# Davr juftliklari: ((joriy_start, joriy_end), (oldingi_start, oldingi_end))
Period = tuple[tuple[date, date], tuple[date, date]]


def period_today(today: date) -> Period:
    return (today, today), (today - timedelta(days=7), today - timedelta(days=7))


def period_week(today: date) -> Period:
    return (
        (today - timedelta(days=6), today),
        (today - timedelta(days=13), today - timedelta(days=7)),
    )


def period_month(today: date) -> Period:
    cur_start = today.replace(day=1)
    prev_end = cur_start - timedelta(days=1)
    prev_start = prev_end.replace(day=1)
    return (cur_start, today), (prev_start, prev_end)


def period_year(year: int) -> Period:
    return (
        (date(year, 1, 1), date(year, 12, 31)),
        (date(year - 1, 1, 1), date(year - 1, 12, 31)),
    )


def today_tashkent() -> date:
    return datetime.now(_TZ).date()


def _last_8_days(today: date) -> list[date]:
    return [today - timedelta(days=i) for i in range(7, -1, -1)]


def _order_select(order_where: list, join_user: bool, *cols):
    stmt = select(*cols).select_from(Order)
    if join_user:
        stmt = stmt.join(User, Order.employee_id == User.id)
    return stmt.where(*order_where)


def _card(key: str, history: list[tuple[date, int]]) -> SummaryCard:
    first, last = history[0][1], history[-1][1]
    trend = round((last - first) / first * 100, 1) if first else None
    return SummaryCard(
        key=key,
        value=last,
        trend_percent=trend,
        history=[HistoryPoint(date=d, value=v) for d, v in history],
    )


async def order_card(
    session: AsyncSession,
    order_where: list,
    join_user: bool,
    key: str,
    today: date,
    status: OrderStatus | None = None,
) -> SummaryCard:
    """Kunlik order kartasi — value = bugungi son; history = oxirgi 8 kun kunlik son."""
    where = list(order_where)
    if status is not None:
        where = where + [Order.status == status]
    start = today - timedelta(days=7)
    rows = await session.execute(
        _order_select(where, join_user, Order.target_date, func.count())
        .where(Order.target_date >= start, Order.target_date <= today)
        .group_by(Order.target_date)
    )
    by_date = {r[0]: r[1] for r in rows.all()}
    return _card(key, [(d, by_date.get(d, 0)) for d in _last_8_days(today)])


async def snapshot_card(
    session: AsyncSession,
    key: str,
    active_where: list,
    created_col,
    today: date,
) -> SummaryCard:
    """Snapshot kartasi — value = joriy jami; history = o'sha kungacha jami (cumulative)."""
    day_expr = cast(func.timezone(settings.timezone, created_col), Date)
    rows = await session.execute(
        select(day_expr, func.count()).where(*active_where).group_by(day_expr)
    )
    by_date = {r[0]: r[1] for r in rows.all() if r[0] is not None}
    history = [
        (day, sum(c for d, c in by_date.items() if d <= day))
        for day in _last_8_days(today)
    ]
    return _card(key, history)


def _card_explicit(
    key: str, history: list[tuple[date, int]], value: int, prev_value: int
) -> SummaryCard:
    """value/trend davr bo'yicha aniq beriladi (history har doim 8 kunlik kunlik qiymat)."""
    trend = round((value - prev_value) / prev_value * 100, 1) if prev_value else None
    return SummaryCard(
        key=key,
        value=max(value, 0),
        trend_percent=trend,
        history=[HistoryPoint(date=d, value=v) for d, v in history],
    )


async def _daily(session, stmt_cols_where, today) -> dict[date, int]:
    start = today - timedelta(days=7)
    rows = await session.execute(
        stmt_cols_where.where(
            Order.target_date >= start, Order.target_date <= today
        ).group_by(Order.target_date)
    )
    return {r[0]: int(r[1]) for r in rows.all()}


async def order_count_card(
    session, where, join_user, key, today, period, status: OrderStatus | None = None
) -> SummaryCard:
    w = list(where) + ([Order.status == status] if status is not None else [])
    (cs, ce), (ps, pe) = period

    async def cnt(s, e):
        return (
            await session.execute(
                _order_select(w, join_user, func.count()).where(
                    Order.target_date >= s, Order.target_date <= e
                )
            )
        ).scalar_one()

    by = await _daily(session, _order_select(w, join_user, Order.target_date, func.count()), today)
    history = [(d, by.get(d, 0)) for d in _last_8_days(today)]
    return _card_explicit(key, history, await cnt(cs, ce), await cnt(ps, pe))


async def revenue_card(session, where, join_user, key, today, period) -> SummaryCard:
    """Pul (UZS) — delivered buyurtmalar historical_price yig'indisi."""
    w = list(where) + [Order.status == OrderStatus.DELIVERED]
    revenue = func.coalesce(func.sum(Order.historical_price), 0)
    (cs, ce), (ps, pe) = period

    async def total(s, e):
        return int(
            (
                await session.execute(
                    _order_select(w, join_user, revenue).where(
                        Order.target_date >= s, Order.target_date <= e
                    )
                )
            ).scalar_one()
        )

    by = await _daily(session, _order_select(w, join_user, Order.target_date, revenue), today)
    history = [(d, by.get(d, 0)) for d in _last_8_days(today)]
    return _card_explicit(key, history, await total(cs, ce), await total(ps, pe))


async def distinct_card(
    session, where, join_user, key, col, today, period
) -> SummaryCard:
    """Noyob (distinct) son — masalan bugun buyurtma bergan xodimlar / kompaniyalar."""
    cnt_expr = func.count(distinct(col))
    (cs, ce), (ps, pe) = period

    async def dcnt(s, e):
        return (
            await session.execute(
                _order_select(where, join_user, cnt_expr).where(
                    Order.target_date >= s, Order.target_date <= e
                )
            )
        ).scalar_one()

    by = await _daily(session, _order_select(where, join_user, Order.target_date, cnt_expr), today)
    history = [(d, by.get(d, 0)) for d in _last_8_days(today)]
    return _card_explicit(key, history, await dcnt(cs, ce), await dcnt(ps, pe))


async def connected_companies_card(session, kitchen_id: str, today: date) -> SummaryCard:
    """Oshxonaga (filiallar orqali) biriktirilgan noyob kompaniyalar — joriy snapshot."""
    value = (
        await session.execute(
            select(func.count(distinct(Branch.company_id)))
            .select_from(BranchKitchen)
            .join(Branch, BranchKitchen.branch_id == Branch.id)
            .where(
                BranchKitchen.kitchen_id == kitchen_id, Branch.deleted_at.is_(None)
            )
        )
    ).scalar_one()
    history = [(d, value) for d in _last_8_days(today)]  # snapshot — tekis chiziq
    return _card_explicit("connected_companies", history, value, value)


async def order_status_totals(
    session: AsyncSession, order_where: list, join_user: bool, year: int
) -> OrderStatusTotals:
    """Yil bo'yicha har status soni — bo'lmagan status 0 (key tashlanmaydi)."""
    rows = await session.execute(
        _order_select(order_where, join_user, Order.status, func.count())
        .where(extract("year", Order.target_date) == year)
        .group_by(Order.status)
    )
    d = {r[0]: r[1] for r in rows.all()}
    return OrderStatusTotals(**{st.value: d.get(st, 0) for st in OrderStatus})


async def monthly_orders(
    session: AsyncSession, order_where: list, join_user: bool, year: int
) -> MonthlyOrders:
    """Oylik delivered/cancelled — aynan 12 ta integer, bo'sh oy 0."""
    month_expr = extract("month", Order.target_date)
    rows = await session.execute(
        _order_select(order_where, join_user, month_expr, Order.status, func.count())
        .where(
            extract("year", Order.target_date) == year,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.CANCELLED]),
        )
        .group_by(month_expr, Order.status)
    )
    delivered = [0] * 12
    cancelled = [0] * 12
    for m, status, cnt in rows.all():
        idx = int(m) - 1
        if status == OrderStatus.DELIVERED:
            delivered[idx] = cnt
        elif status == OrderStatus.CANCELLED:
            cancelled[idx] = cnt
    return MonthlyOrders(year=year, delivered=delivered, cancelled=cancelled)


async def build_dashboard(
    session: AsyncSession,
    order_where: list,
    join_user: bool,
    summary: list[SummaryCard],
    year: int,
) -> DashboardResponse:
    return DashboardResponse(
        year=year,
        timezone=settings.timezone,
        generated_at=datetime.now(_TZ),
        summary=summary,
        order_status_totals=await order_status_totals(
            session, order_where, join_user, year
        ),
        monthly_orders=await monthly_orders(session, order_where, join_user, year),
    )
