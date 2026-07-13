"""Store employee payment status by month.

Revision ID: 0013
Revises: 0012
"""

from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "employee_monthly_payments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("employee_id", sa.String(36), nullable=False),
        sa.Column("period_month", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "paid", name="employee_monthly_payment_status", native_enum=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "employee_id", "period_month", name="uq_employee_monthly_payment"),
    )
    op.create_index("ix_employee_monthly_payments_company_id", "employee_monthly_payments", ["company_id"])
    op.create_index("ix_employee_monthly_payments_employee_id", "employee_monthly_payments", ["employee_id"])
    op.create_index("ix_employee_monthly_payments_period_month", "employee_monthly_payments", ["period_month"])


def downgrade() -> None:
    op.drop_index("ix_employee_monthly_payments_period_month", table_name="employee_monthly_payments")
    op.drop_index("ix_employee_monthly_payments_employee_id", table_name="employee_monthly_payments")
    op.drop_index("ix_employee_monthly_payments_company_id", table_name="employee_monthly_payments")
    op.drop_table("employee_monthly_payments")
