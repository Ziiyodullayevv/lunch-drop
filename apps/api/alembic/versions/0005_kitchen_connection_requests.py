"""Kitchen connection approval workflow.

Revision ID: 0005
Revises: 0004
"""

from typing import Sequence, Union
import uuid

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "kitchen_connection_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.String(length=36), nullable=False),
        sa.Column("branch_id", sa.String(length=36), nullable=False),
        sa.Column("kitchen_id", sa.String(length=36), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "approved",
                "rejected",
                "cancelled",
                name="connection_request_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("requested_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("reviewed_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["kitchen_id"], ["kitchens.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("company_id", "branch_id", "kitchen_id", "status"):
        op.create_index(
            f"ix_kitchen_connection_requests_{column}",
            "kitchen_connection_requests",
            [column],
        )

    # Oldingi faol linklar tasdiqlangan tarix sifatida saqlanadi.
    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            """
            SELECT b.company_id, bk.branch_id, bk.kitchen_id,
                   bk.created_at, bk.updated_at
            FROM branch_kitchens bk
            JOIN branches b ON b.id = bk.branch_id
            """
        )
    ).mappings()
    for row in rows:
        connection.execute(
            sa.text(
                """
                INSERT INTO kitchen_connection_requests
                    (id, company_id, branch_id, kitchen_id, status, created_at, updated_at)
                VALUES
                    (:id, :company_id, :branch_id, :kitchen_id, 'approved', :created_at, :updated_at)
                """
            ),
            {"id": str(uuid.uuid4()), **dict(row)},
        )


def downgrade() -> None:
    for column in ("status", "kitchen_id", "branch_id", "company_id"):
        op.drop_index(
            f"ix_kitchen_connection_requests_{column}",
            table_name="kitchen_connection_requests",
        )
    op.drop_table("kitchen_connection_requests")
