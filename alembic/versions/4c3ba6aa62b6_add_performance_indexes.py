"""add_performance_indexes

Revision ID: 4c3ba6aa62b6
Revises: 1c6db6684afd
Create Date: 2026-05-22 17:33:15.614488

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c3ba6aa62b6'
down_revision: Union[str, Sequence[str], None] = '1c6db6684afd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Os índices ix_*_id abaixo eram redundantes (PK já tem índice implícito).
    # Foram criados pelo create_all antigo com index=True nos PKs.
    # IF EXISTS garante que esta migration funcione em bancos criados via Alembic
    # (migration inicial) onde esses índices nunca foram criados.
    op.execute('DROP INDEX IF EXISTS "ix_Canteiros_id"')
    op.execute('DROP INDEX IF EXISTS "ix_Ciclos_Producao_id"')
    op.execute('DROP INDEX IF EXISTS "ix_Demandas_id"')
    op.execute('DROP INDEX IF EXISTS "ix_Hortas_id"')
    op.execute('DROP INDEX IF EXISTS "ix_Intencoes_Plantio_id"')
    op.execute('DROP INDEX IF EXISTS "ix_Produtos_id"')
    op.execute('DROP INDEX IF EXISTS "ix_Solicitacoes_Plantio_id"')
    op.execute('DROP INDEX IF EXISTS "ix_Usuarios_id"')
    op.execute('DROP INDEX IF EXISTS "ix_Zonas_Risco_id"')

    op.create_index(op.f('ix_Canteiros_horta_id'), 'Canteiros', ['horta_id'], unique=False)
    op.create_index(op.f('ix_Canteiros_usuario_id'), 'Canteiros', ['usuario_id'], unique=False)
    op.create_index(op.f('ix_Ciclos_Producao_canteiro_id'), 'Ciclos_Producao', ['canteiro_id'], unique=False)
    op.create_index(op.f('ix_Ciclos_Producao_produto_id'), 'Ciclos_Producao', ['produto_id'], unique=False)
    op.create_index(op.f('ix_Demandas_horta_id'), 'Demandas', ['horta_id'], unique=False)
    op.create_index(op.f('ix_Intencoes_Plantio_horta_id'), 'Intencoes_Plantio', ['horta_id'], unique=False)
    op.create_index(op.f('ix_Solicitacoes_Plantio_canteiro_id'), 'Solicitacoes_Plantio', ['canteiro_id'], unique=False)
    op.create_index(op.f('ix_Usuarios_horta_id'), 'Usuarios', ['horta_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.create_index(op.f('ix_Zonas_Risco_id'), 'Zonas_Risco', ['id'], unique=False)
    op.drop_index(op.f('ix_Usuarios_horta_id'), table_name='Usuarios')
    op.create_index(op.f('ix_Usuarios_id'), 'Usuarios', ['id'], unique=False)
    op.drop_index(op.f('ix_Solicitacoes_Plantio_canteiro_id'), table_name='Solicitacoes_Plantio')
    op.create_index(op.f('ix_Solicitacoes_Plantio_id'), 'Solicitacoes_Plantio', ['id'], unique=False)
    op.create_index(op.f('ix_Produtos_id'), 'Produtos', ['id'], unique=False)
    op.drop_index(op.f('ix_Intencoes_Plantio_horta_id'), table_name='Intencoes_Plantio')
    op.create_index(op.f('ix_Intencoes_Plantio_id'), 'Intencoes_Plantio', ['id'], unique=False)
    op.create_index(op.f('ix_Hortas_id'), 'Hortas', ['id'], unique=False)
    op.drop_index(op.f('ix_Demandas_horta_id'), table_name='Demandas')
    op.create_index(op.f('ix_Demandas_id'), 'Demandas', ['id'], unique=False)
    op.drop_index(op.f('ix_Ciclos_Producao_produto_id'), table_name='Ciclos_Producao')
    op.drop_index(op.f('ix_Ciclos_Producao_canteiro_id'), table_name='Ciclos_Producao')
    op.create_index(op.f('ix_Ciclos_Producao_id'), 'Ciclos_Producao', ['id'], unique=False)
    op.drop_index(op.f('ix_Canteiros_usuario_id'), table_name='Canteiros')
    op.drop_index(op.f('ix_Canteiros_horta_id'), table_name='Canteiros')
    op.create_index(op.f('ix_Canteiros_id'), 'Canteiros', ['id'], unique=False)
