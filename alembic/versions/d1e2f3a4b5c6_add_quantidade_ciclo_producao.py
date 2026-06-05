"""add_quantidade_ciclo_producao

Revision ID: d1e2f3a4b5c6
Revises: b8d3f1a5c4e2
Create Date: 2026-06-04 16:10:00.000000

Adiciona Ciclos_Producao.quantidade (nullable) — quantidade plantada coletada
pelo app. CHECK quantidade > 0 (satisfeito por NULL em coluna nullable).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'b8d3f1a5c4e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('Ciclos_Producao', sa.Column('quantidade', sa.Integer(), nullable=True))
    op.create_check_constraint(
        'ck_ciclos_producao_quantidade_positiva',
        'Ciclos_Producao',
        'quantidade > 0',
    )


def downgrade() -> None:
    op.drop_constraint('ck_ciclos_producao_quantidade_positiva', 'Ciclos_Producao', type_='check')
    op.drop_column('Ciclos_Producao', 'quantidade')
