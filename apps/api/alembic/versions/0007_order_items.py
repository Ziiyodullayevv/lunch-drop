"""Multi-item orders.

Revision ID: 0007
Revises: 0006
"""

from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "order_items",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("order_id", sa.String(36), nullable=False),
        sa.Column("meal_id", sa.String(36), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("historical_price", sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(["meal_id"], ["meals.id"]),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.execute(
        """
        INSERT INTO order_items (id, order_id, meal_id, quantity, historical_price)
        SELECT md5(random()::text || clock_timestamp()::text || id)::uuid::text,
               id, meal_id, 1, historical_price
        FROM orders
        """
    )


def downgrade() -> None:
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
