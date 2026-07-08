from sqlalchemy import select

from app.models.branch import Branch
from app.repositories.base import CrudRepository


class BranchRepository(CrudRepository[Branch]):
    model = Branch

    async def list_by_company(
        self, company_id: str, *, limit: int = 20, offset: int = 0
    ) -> list[Branch]:
        result = await self.session.execute(
            select(Branch)
            .where(Branch.company_id == company_id, Branch.deleted_at.is_(None))
            .order_by(Branch.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
