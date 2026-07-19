"""add criado_em finalizado_em em demandas

Revision ID: ef8c899750c9
Revises: fa212378d876
Create Date: 2026-07-19 19:29:49.011210

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef8c899750c9'
down_revision: Union[str, Sequence[str], None] = 'fa212378d876'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('Demandas', sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('Demandas', sa.Column('finalizado_em', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('Demandas', 'finalizado_em')
    op.drop_column('Demandas', 'criado_em')
