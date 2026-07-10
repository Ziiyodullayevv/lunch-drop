"""Telegram daily menu delivery idempotency.

Revision ID: 0004
Revises: 0003
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "telegram_menu_deliveries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "target_date", name="uq_telegram_menu_user_date"
        ),
    )
    op.create_index(
        "ix_telegram_menu_deliveries_target_date",
        "telegram_menu_deliveries",
        ["target_date"],
    )
    op.create_index(
        "ix_telegram_menu_deliveries_user_id",
        "telegram_menu_deliveries",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_telegram_menu_deliveries_user_id",
        table_name="telegram_menu_deliveries",
    )
    op.drop_index(
        "ix_telegram_menu_deliveries_target_date",
        table_name="telegram_menu_deliveries",
    )
    op.drop_table("telegram_menu_deliveries")
