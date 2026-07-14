"""Telegram employee order drafts and status outbox.

Revision ID: 0014
Revises: 0013
"""

from alembic import op
import sqlalchemy as sa


revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "telegram_order_drafts",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("branch_id", sa.String(36), nullable=True),
        sa.Column("kitchen_id", sa.String(36), nullable=True),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["kitchen_id"], ["kitchens.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_telegram_order_drafts_user_id",
        "telegram_order_drafts",
        ["user_id"],
        unique=True,
    )

    op.create_table(
        "telegram_order_status_outbox",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("order_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "order_id", "status", name="uq_telegram_order_status_order_status"
        ),
    )
    for column in ("order_id", "user_id", "next_attempt_at", "sent_at"):
        op.create_index(
            f"ix_telegram_order_status_outbox_{column}",
            "telegram_order_status_outbox",
            [column],
        )


def downgrade() -> None:
    for column in ("sent_at", "next_attempt_at", "user_id", "order_id"):
        op.drop_index(
            f"ix_telegram_order_status_outbox_{column}",
            table_name="telegram_order_status_outbox",
        )
    op.drop_table("telegram_order_status_outbox")
    op.drop_index(
        "ix_telegram_order_drafts_user_id", table_name="telegram_order_drafts"
    )
    op.drop_table("telegram_order_drafts")
