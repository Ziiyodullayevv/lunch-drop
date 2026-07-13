"""Allow one phone and Telegram account to own multiple role profiles.

Revision ID: 0012
Revises: 0011
"""

from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_users_phone", table_name="users")
    op.create_index("ix_users_phone", "users", ["phone"], unique=False)
    op.create_unique_constraint("uq_users_phone_role", "users", ["phone", "role"])

    op.drop_index("ix_telegram_accounts_telegram_user_id", table_name="telegram_accounts")
    op.drop_constraint(
        "telegram_accounts_telegram_user_id_key",
        "telegram_accounts",
        type_="unique",
    )
    op.create_index(
        "ix_telegram_accounts_telegram_user_id",
        "telegram_accounts",
        ["telegram_user_id"],
        unique=False,
    )
    op.add_column(
        "telegram_accounts",
        sa.Column(
            "is_selected",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.execute("UPDATE telegram_accounts SET is_selected = true")


def downgrade() -> None:
    op.drop_column("telegram_accounts", "is_selected")
    op.drop_index("ix_telegram_accounts_telegram_user_id", table_name="telegram_accounts")
    op.create_unique_constraint(
        "telegram_accounts_telegram_user_id_key",
        "telegram_accounts",
        ["telegram_user_id"],
    )
    op.create_index(
        "ix_telegram_accounts_telegram_user_id",
        "telegram_accounts",
        ["telegram_user_id"],
        unique=True,
    )

    op.drop_constraint("uq_users_phone_role", "users", type_="unique")
    op.drop_index("ix_users_phone", table_name="users")
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)
