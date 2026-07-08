from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.kitchen import BranchKitchen
    from app.models.user import User


class Branch(Base, TimestampMixin, SoftDeleteMixin):
    """Filial. Xodimlar filialga biriktiriladi, filialga oshxonalar ulanadi."""

    __tablename__ = "branches"

    id: Mapped[str] = uuid_pk()
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)

    company: Mapped[Company] = relationship(back_populates="branches")
    employee_links: Mapped[list[EmployeeBranch]] = relationship(back_populates="branch")
    kitchen_links: Mapped[list[BranchKitchen]] = relationship(back_populates="branch")


class EmployeeBranch(Base, TimestampMixin):
    """Xodim ↔ Filial a'zoligi (M:N). Bir xodim bir nechta filialda ishlay oladi."""

    __tablename__ = "employee_branches"
    __table_args__ = (
        UniqueConstraint("user_id", "branch_id", name="uq_employee_branch"),
    )

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    branch_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("branches.id"), nullable=False, index=True
    )

    user: Mapped[User] = relationship(back_populates="branch_memberships")
    branch: Mapped[Branch] = relationship(back_populates="employee_links")
