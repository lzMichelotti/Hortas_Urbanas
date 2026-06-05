"""add_alertas_zona_risco

Revision ID: 667a84c09ffc
Revises: 4684eabd296d
Create Date: 2026-05-25 18:58:23.308984

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '667a84c09ffc'
down_revision: Union[str, Sequence[str], None] = '4684eabd296d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('Zonas_Risco', sa.Column('ativa', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('Zonas_Risco', sa.Column('data_ocorrencia', sa.DateTime(), nullable=True))
    op.add_column('Zonas_Risco', sa.Column('data_fim', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('Zonas_Risco', 'data_fim')
    op.drop_column('Zonas_Risco', 'data_ocorrencia')
    op.drop_column('Zonas_Risco', 'ativa')
