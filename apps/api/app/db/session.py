"""Async DB engine va session factory.

`structure.md` qoidasi: `expire_on_commit=False` — commit dan keyin ham
ob'ektlarga kirish mumkin. Lazy loading ishlatilmaydi (selectinload majburiy).
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — har so'rov uchun bitta async session beradi."""
    async with AsyncSessionLocal() as session:
        yield session
