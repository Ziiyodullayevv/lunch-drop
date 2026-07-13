"""User DB access. Service shu repo orqali ishlaydi — SQL servisda yozilmaydi."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.enums import UserRole


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: str) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_phone(self, phone: str) -> User | None:
        users = await self.list_by_phone(phone)
        return users[0] if users else None

    async def list_by_phone(self, phone: str) -> list[User]:
        result = await self.session.execute(
            select(User).where(User.phone == phone).order_by(User.created_at)
        )
        return list(result.scalars().all())

    async def get_by_phone_and_role(
        self, phone: str, role: UserRole
    ) -> User | None:
        result = await self.session.execute(
            select(User).where(User.phone == phone, User.role == role)
        )
        return result.scalar_one_or_none()

    async def add(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user
