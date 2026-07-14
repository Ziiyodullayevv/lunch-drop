"""APScheduler runner — alohida jarayon.

Ishga tushirish:  python -m app.workers.scheduler
(uvicorn workerlarida EMAS — aks holda har worker'da takrorlanadi.)
"""

import asyncio

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.workers.tasks import generate_invoices, transition_order_statuses
from bot.delivery import send_due_delivery_prompts
from bot.employee_delivery import send_due_employee_delivery_notices
from bot.menu import send_daily_telegram_menus
from bot.orders import send_due_kitchen_order_summaries
from bot.order_status import send_pending_order_statuses

log = structlog.get_logger()


async def main() -> None:
    scheduler = AsyncIOScheduler(timezone=settings.timezone)
    # Buyurtma statuslari — har 1 daqiqa.
    scheduler.add_job(
        transition_order_statuses, "interval", minutes=1, id="status_transitions"
    )
    scheduler.add_job(
        send_pending_order_statuses,
        "interval",
        minutes=1,
        id="telegram_order_status_outbox",
        coalesce=True,
        max_instances=1,
    )
    # Cutoff tugagach oshxona adminlariga bugungi buyurtmalar jamlanmasi.
    scheduler.add_job(
        send_due_kitchen_order_summaries,
        "interval",
        minutes=1,
        id="telegram_kitchen_order_summaries",
        coalesce=True,
        max_instances=1,
    )
    # Yetkazish boshlanganda har bir filial uchun admin tasdig'i.
    scheduler.add_job(
        send_due_delivery_prompts,
        "interval",
        minutes=1,
        id="telegram_delivery_prompts",
        coalesce=True,
        max_instances=1,
    )
    # Yetkazish tugaganda buyurtmachiga app va Telegram xabari.
    scheduler.add_job(
        send_due_employee_delivery_notices,
        "interval",
        minutes=1,
        id="employee_delivery_notices",
        coalesce=True,
        max_instances=1,
    )
    # Invoicing — har kuni 23:59 (Asia/Tashkent).
    scheduler.add_job(generate_invoices, "cron", hour=23, minute=59, id="invoices")
    # Xodimlarga bugungi menyu — har kuni 08:00 (Asia/Tashkent).
    scheduler.add_job(
        send_daily_telegram_menus,
        "cron",
        hour=8,
        minute=0,
        id="telegram_daily_menu",
        coalesce=True,
        misfire_grace_time=3600,
        max_instances=1,
    )
    scheduler.start()
    log.info("scheduler_started", timezone=settings.timezone)

    await asyncio.Event().wait()  # cheksiz kutish


if __name__ == "__main__":
    asyncio.run(main())
