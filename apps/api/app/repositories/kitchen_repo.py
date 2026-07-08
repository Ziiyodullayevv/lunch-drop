from sqlalchemy import select

from app.models.kitchen import BranchKitchen, Kitchen
from app.repositories.base import CrudRepository


class KitchenRepository(CrudRepository[Kitchen]):
    model = Kitchen

    async def links_for_branch(self, branch_id: str) -> list[BranchKitchen]:
        result = await self.session.execute(
            select(BranchKitchen).where(BranchKitchen.branch_id == branch_id)
        )
        return list(result.scalars().all())

    async def kitchens_for_branch(self, branch_id: str) -> list[Kitchen]:
        result = await self.session.execute(
            select(Kitchen)
            .join(BranchKitchen, BranchKitchen.kitchen_id == Kitchen.id)
            .where(BranchKitchen.branch_id == branch_id, Kitchen.deleted_at.is_(None))
            .order_by(Kitchen.name)
        )
        return list(result.scalars().all())
