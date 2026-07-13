"""Employee delivery-end app and Telegram notices.

Revision ID: 0011
Revises: 0010
"""

from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "employee_delivery_notices",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("kitchen_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("branch_id", sa.String(36), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=False),
        sa.Column("app_notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("telegram_notified_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["kitchen_id"], ["kitchens.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "kitchen_id",
            "user_id",
            "branch_id",
            "target_date",
            name="uq_employee_delivery_notice_recipient_branch_date",
        ),
    )
    for column in ("kitchen_id", "user_id", "branch_id", "target_date"):
        op.create_index(
            f"ix_employee_delivery_notices_{column}",
            "employee_delivery_notices",
            [column],
        )


def downgrade() -> None:
    for column in ("target_date", "branch_id", "user_id", "kitchen_id"):
        op.drop_index(
            f"ix_employee_delivery_notices_{column}",
            table_name="employee_delivery_notices",
        )
    op.drop_table("employee_delivery_notices")
