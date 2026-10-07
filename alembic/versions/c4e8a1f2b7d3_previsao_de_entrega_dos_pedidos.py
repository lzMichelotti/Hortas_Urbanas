"""previsao de entrega dos pedidos e criado_em da solicitacao de plantio

Revision ID: c4e8a1f2b7d3
Revises: 8bb419886364
Create Date: 2026-10-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4e8a1f2b7d3'
down_revision: Union[str, Sequence[str], None] = '8bb419886364'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Pedidos que já existiam não têm a data real: ficam com a data desta migration.
    op.add_column(
        'Solicitacoes_Plantio',
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.add_column('Solicitacoes_Plantio', sa.Column('previsao_entrega', sa.Date(), nullable=True))
    op.add_column('Demandas', sa.Column('previsao_entrega', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('Demandas', 'previsao_entrega')
    op.drop_column('Solicitacoes_Plantio', 'previsao_entrega')
    op.drop_column('Solicitacoes_Plantio', 'criado_em')
