"""Kitchen settlement payment ledger.

Revision ID: 0015
Revises: 0014
"""

from alembic import op
import sqlalchemy as sa


revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "settlement_payments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("kitchen_id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("period_month", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_at", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(40), nullable=True),
        sa.Column("transaction_reference", sa.String(255), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("receipt_url", sa.String(512), nullable=True),
        sa.Column("created_by_user_id", sa.String(36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["kitchen_id"], ["kitchens.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    for name, columns in (("kitchen_id", ["kitchen_id"]), ("company_id", ["company_id"]), ("period_month", ["period_month"]), ("created_by_user_id", ["created_by_user_id"])):
        op.create_index(f"ix_settlement_payments_{name}", "settlement_payments", columns)


def downgrade() -> None:
    for name in ("created_by_user_id", "period_month", "company_id", "kitchen_id"):
        op.drop_index(f"ix_settlement_payments_{name}", table_name="settlement_payments")
    op.drop_table("settlement_payments")
