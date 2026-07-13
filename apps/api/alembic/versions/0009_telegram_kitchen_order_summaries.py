"""Telegram kitchen order summary delivery idempotency.

Revision ID: 0009
Revises: 0008
"""

from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "telegram_kitchen_order_summary_deliveries",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("kitchen_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("branch_id", sa.String(36), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.ForeignKeyConstraint(["kitchen_id"], ["kitchens.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "kitchen_id",
            "user_id",
            "branch_id",
            "target_date",
            name="uq_telegram_kitchen_order_summary_recipient_branch_date",
        ),
    )
    op.create_index(
        "ix_telegram_kitchen_order_summary_deliveries_kitchen_id",
        "telegram_kitchen_order_summary_deliveries",
        ["kitchen_id"],
    )
    op.create_index(
        "ix_telegram_kitchen_order_summary_deliveries_user_id",
        "telegram_kitchen_order_summary_deliveries",
        ["user_id"],
    )
    op.create_index(
        "ix_telegram_kitchen_order_summary_deliveries_branch_id",
        "telegram_kitchen_order_summary_deliveries",
        ["branch_id"],
    )
    op.create_index(
        "ix_telegram_kitchen_order_summary_deliveries_target_date",
        "telegram_kitchen_order_summary_deliveries",
        ["target_date"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_telegram_kitchen_order_summary_deliveries_target_date",
        table_name="telegram_kitchen_order_summary_deliveries",
    )
    op.drop_index(
        "ix_telegram_kitchen_order_summary_deliveries_branch_id",
        table_name="telegram_kitchen_order_summary_deliveries",
    )
    op.drop_index(
        "ix_telegram_kitchen_order_summary_deliveries_user_id",
        table_name="telegram_kitchen_order_summary_deliveries",
    )
    op.drop_index(
        "ix_telegram_kitchen_order_summary_deliveries_kitchen_id",
        table_name="telegram_kitchen_order_summary_deliveries",
    )
    op.drop_table("telegram_kitchen_order_summary_deliveries")
