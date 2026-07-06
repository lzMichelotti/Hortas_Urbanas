"""add canteiro_id em demandas

Revision ID: 3490c6dff89a
Revises: d1e2f3a4b5c6
Create Date: 2026-06-15 09:16:40.417709

Demandas.canteiro_id (nullable, FK Canteiros ondelete CASCADE): preenchido =
pedido de material de um membro ao líder; NULL = demanda da horta à prefeitura.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3490c6dff89a'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('Demandas', sa.Column('canteiro_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_Demandas_canteiro_id'), 'Demandas', ['canteiro_id'], unique=False)
    op.create_foreign_key(
        'fk_demandas_canteiro_id', 'Demandas', 'Canteiros',
        ['canteiro_id'], ['id'], ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('fk_demandas_canteiro_id', 'Demandas', type_='foreignkey')
    op.drop_index(op.f('ix_Demandas_canteiro_id'), table_name='Demandas')
    op.drop_column('Demandas', 'canteiro_id')
