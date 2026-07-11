"""Telegram OTP claim workflow.

Revision ID: 0006
Revises: 0005
"""

from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("otp_codes", sa.Column("telegram_token_hash", sa.String(64), nullable=True))
    op.add_column("otp_codes", sa.Column("telegram_user_id", sa.BigInteger(), nullable=True))
    op.add_column("otp_codes", sa.Column("telegram_claimed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_otp_codes_telegram_token_hash", "otp_codes", ["telegram_token_hash"], unique=True)
    op.create_index("ix_otp_codes_telegram_user_id", "otp_codes", ["telegram_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_otp_codes_telegram_user_id", table_name="otp_codes")
    op.drop_index("ix_otp_codes_telegram_token_hash", table_name="otp_codes")
    op.drop_column("otp_codes", "telegram_claimed_at")
    op.drop_column("otp_codes", "telegram_user_id")
    op.drop_column("otp_codes", "telegram_token_hash")
