"""add_quantidade_solicitacao_plantio

Revision ID: a1b2c3d4e5f6
Revises: 3490c6dff89a
Create Date: 2026-06-21 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '3490c6dff89a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'Solicitacoes_Plantio',
        sa.Column('quantidade', sa.Integer(), nullable=False, server_default=sa.text('1')),
    )
    op.create_check_constraint(
        'ck_solicitacoes_plantio_quantidade_positiva',
        'Solicitacoes_Plantio',
        'quantidade > 0',
    )


def downgrade() -> None:
    op.drop_constraint('ck_solicitacoes_plantio_quantidade_positiva', 'Solicitacoes_Plantio', type_='check')
    op.drop_column('Solicitacoes_Plantio', 'quantidade')
