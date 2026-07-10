"""APScheduler runner — alohida jarayon.

Ishga tushirish:  python -m app.workers.scheduler
(uvicorn workerlarida EMAS — aks holda har worker'da takrorlanadi.)
"""

import asyncio

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.workers.tasks import generate_invoices, transition_order_statuses
from bot.menu import send_daily_telegram_menus

log = structlog.get_logger()


async def main() -> None:
    scheduler = AsyncIOScheduler(timezone=settings.timezone)
    # Buyurtma statuslari — har 1 daqiqa.
    scheduler.add_job(
        transition_order_statuses, "interval", minutes=1, id="status_transitions"
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
