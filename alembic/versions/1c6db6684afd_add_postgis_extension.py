"""add_postgis_extension

Revision ID: 1c6db6684afd
Revises: 87fb30218f89
Create Date: 2026-05-22 16:46:41.095296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c6db6684afd'
down_revision: Union[str, Sequence[str], None] = '87fb30218f89'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS postgis")
