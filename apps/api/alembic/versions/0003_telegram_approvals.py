"""Telegram account linking and approval audit.

Revision ID: 0003
Revises: 0002
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "telegram_accounts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
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
        sa.UniqueConstraint("telegram_user_id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_telegram_accounts_chat_id", "telegram_accounts", ["chat_id"])
    op.create_index(
        "ix_telegram_accounts_telegram_user_id",
        "telegram_accounts",
        ["telegram_user_id"],
        unique=True,
    )
    op.create_index(
        "ix_telegram_accounts_user_id", "telegram_accounts", ["user_id"], unique=True
    )

    op.create_table(
        "approval_actions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("target_user_id", sa.String(length=36), nullable=False),
        sa.Column("actor_user_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("telegram_message_id", sa.BigInteger(), nullable=True),
        sa.Column("acted_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("target_user_id", name="uq_approval_action_target"),
    )
    op.create_index(
        "ix_approval_actions_actor_user_id", "approval_actions", ["actor_user_id"]
    )
    op.create_index(
        "ix_approval_actions_target_user_id", "approval_actions", ["target_user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_approval_actions_target_user_id", table_name="approval_actions")
    op.drop_index("ix_approval_actions_actor_user_id", table_name="approval_actions")
    op.drop_table("approval_actions")
    op.drop_index("ix_telegram_accounts_user_id", table_name="telegram_accounts")
    op.drop_index(
        "ix_telegram_accounts_telegram_user_id", table_name="telegram_accounts"
    )
    op.drop_index("ix_telegram_accounts_chat_id", table_name="telegram_accounts")
    op.drop_table("telegram_accounts")
