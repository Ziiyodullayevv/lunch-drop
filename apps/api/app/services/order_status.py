"""Order statusini, in-app xabarini va Telegram outboxni birga yozish."""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ORDER_STATUS_LABELS, OrderStatus
from app.models.order import Order
from app.models.telegram import TelegramOrderStatusOutbox
from app.services.notification_service import notify

SYSTEM_FEE_RATE = Decimal("0.03")


async def record_order_status(
    session: AsyncSession,
    order: Order,
    status: OrderStatus,
    *,
    update_order: bool = True,
) -> bool:
    """Status va uning ikki kanal xabarini idempotent yaratadi."""
    changed = order.status != status
    if update_order:
        order.status = status
    if status == OrderStatus.DELIVERED and order.system_fee == 0:
        order.system_fee = (order.historical_price * SYSTEM_FEE_RATE).quantize(
            Decimal("0.01")
        )

    existing = (
        await session.execute(
            select(TelegramOrderStatusOutbox.id).where(
                TelegramOrderStatusOutbox.order_id == order.id,
                TelegramOrderStatusOutbox.status == status.value,
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        session.add(
            TelegramOrderStatusOutbox(
                order_id=order.id,
                user_id=order.employee_id,
                status=status.value,
            )
        )
        await notify(
            session,
            order.employee_id,
            "order_status",
            f"Buyurtma holati: {ORDER_STATUS_LABELS[status]}",
            f"Buyurtmangiz holati «{ORDER_STATUS_LABELS[status]}» ga o‘zgardi.",
        )
        # Session autoflush=False; keyingi shu transactiondagi takroriy chaqiriq
        # unique outbox yozuvini ko'ra olishi uchun darhol flush qilamiz.
        await session.flush()
    return changed
