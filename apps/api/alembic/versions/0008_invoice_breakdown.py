"""Invoice branch and employee breakdowns.

Revision ID: 0008
Revises: 0007
"""

from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    def common_columns():
        return [
            sa.Column("id", sa.String(36), nullable=False),
            sa.Column("invoice_id", sa.String(36), nullable=False),
            sa.Column("branch_id", sa.String(36), nullable=False),
            sa.Column("order_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("total_system_fee", sa.Numeric(10, 2), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        ]
    branch_columns = common_columns()
    op.create_table(
        "invoice_branch_summaries", *branch_columns,
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoice_branch_summaries_invoice_id", "invoice_branch_summaries", ["invoice_id"])
    employee_columns = common_columns()
    # employee_id is inserted after invoice_id; branch_id remains shared with both summaries.
    employee_columns.insert(2, sa.Column("employee_id", sa.String(36), nullable=False))
    op.create_table(
        "invoice_employee_summaries", *employee_columns,
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoice_employee_summaries_invoice_id", "invoice_employee_summaries", ["invoice_id"])


def downgrade() -> None:
    op.drop_index("ix_invoice_employee_summaries_invoice_id", table_name="invoice_employee_summaries")
    op.drop_table("invoice_employee_summaries")
    op.drop_index("ix_invoice_branch_summaries_invoice_id", table_name="invoice_branch_summaries")
    op.drop_table("invoice_branch_summaries")
