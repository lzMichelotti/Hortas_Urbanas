"""encaminhamento de solicitacao ao admin

Revision ID: 8bb419886364
Revises: b3c7f0a91d24
Create Date: 2026-08-03 23:11:58.326334

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8bb419886364'
down_revision: Union[str, Sequence[str], None] = 'b3c7f0a91d24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'Solicitacoes_Plantio',
        sa.Column('encaminhada_em', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('Solicitacoes_Plantio', 'encaminhada_em')
