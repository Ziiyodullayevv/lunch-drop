"""Telegram delivery start confirmation prompts.

Revision ID: 0010
Revises: 0009
"""

from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "telegram_delivery_prompts",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("kitchen_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("branch_id", sa.String(36), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("action", sa.String(32), nullable=False),
        sa.Column("telegram_message_id", sa.BigInteger(), nullable=True),
        sa.Column("prompted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_by_user_id", sa.String(36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["confirmed_by_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["kitchen_id"], ["kitchens.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "kitchen_id",
            "user_id",
            "branch_id",
            "target_date",
            "action",
            name="uq_telegram_delivery_prompt_recipient_branch_date_action",
        ),
    )
    for column in ("kitchen_id", "user_id", "branch_id", "target_date"):
        op.create_index(
            f"ix_telegram_delivery_prompts_{column}",
            "telegram_delivery_prompts",
            [column],
        )


def downgrade() -> None:
    for column in ("target_date", "branch_id", "user_id", "kitchen_id"):
        op.drop_index(
            f"ix_telegram_delivery_prompts_{column}",
            table_name="telegram_delivery_prompts",
        )
    op.drop_table("telegram_delivery_prompts")
