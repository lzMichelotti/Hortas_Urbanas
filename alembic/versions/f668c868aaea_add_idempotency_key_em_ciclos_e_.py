"""add idempotency_key em ciclos e solicitacoes

Revision ID: f668c868aaea
Revises: c8493ef9a3fc
Create Date: 2026-05-27 10:16:44.825019

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f668c868aaea'
down_revision: Union[str, Sequence[str], None] = 'c8493ef9a3fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('Ciclos_Producao', sa.Column('idempotency_key', sa.UUID(), nullable=True))
    op.create_unique_constraint('uq_ciclos_producao_idempotency', 'Ciclos_Producao', ['canteiro_id', 'idempotency_key'])
    op.add_column('Solicitacoes_Plantio', sa.Column('idempotency_key', sa.UUID(), nullable=True))
    op.create_unique_constraint('uq_solicitacoes_plantio_idempotency', 'Solicitacoes_Plantio', ['canteiro_id', 'idempotency_key'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_solicitacoes_plantio_idempotency', 'Solicitacoes_Plantio', type_='unique')
    op.drop_column('Solicitacoes_Plantio', 'idempotency_key')
    op.drop_constraint('uq_ciclos_producao_idempotency', 'Ciclos_Producao', type_='unique')
    op.drop_column('Ciclos_Producao', 'idempotency_key')
