"""telefone opcional no usuario

Revision ID: d7a2f4c1e908
Revises: c4e8a1f2b7d3
Create Date: 2026-10-17 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd7a2f4c1e908'
down_revision: Union[str, Sequence[str], None] = 'c4e8a1f2b7d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('Usuarios', 'telefone', existing_type=sa.String(20), nullable=True)


def downgrade() -> None:
    # Quem ficou sem telefone recebe string vazia: sem isso a coluna não volta a NOT NULL.
    op.execute("UPDATE \"Usuarios\" SET telefone = '' WHERE telefone IS NULL")
    op.alter_column('Usuarios', 'telefone', existing_type=sa.String(20), nullable=False)
