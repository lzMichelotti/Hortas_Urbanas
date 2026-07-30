"""pedido unico: status compartilhado, idempotencia e hard delete em demandas

Revision ID: c7a1d8e34b52
Revises: b8d3e5f21a70
Create Date: 2026-07-30 14:00:00.000000

Planta e material passam a usar o mesmo ciclo de status. O mapeamento dos dados
existentes de Solicitacoes_Plantio é APROVADA -> EM_ATENDIMENTO (e não ATENDIDA):
aprovar agora significa "vou separar a muda", e a entrega é um segundo passo que
o líder ainda precisa dar. Pedidos já aprovados voltam para a lista dele fechar.

O DELETE das demandas com ativo = false é obrigatório, não faxina: sem ele, tirar
a coluna faria as demandas já apagadas voltarem a aparecer na tela do líder. É o
único passo irreversível daqui — faça o dump antes de rodar.

A UNIQUE de idempotência é (horta_id, idempotency_key) porque horta_id está
sempre preenchido, inclusive na demanda de horta, onde canteiro_id é nulo. Com o
NULLS DISTINCT padrão, quem não manda o header não esbarra na constraint.
Ref: postgresql.org/docs/15/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS

Nenhum passo reescreve tabela; o CHECK e a UNIQUE apenas varrem para conferir.
Ref: postgresql.org/docs/15/sql-altertable.html#SQL-ALTERTABLE-NOTES
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c7a1d8e34b52'
down_revision: Union[str, Sequence[str], None] = 'b8d3e5f21a70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_solicitacoes_plantio_status', 'Solicitacoes_Plantio', type_='check')
    op.execute("""
        UPDATE "Solicitacoes_Plantio" SET status = CASE status
            WHEN 'PENDENTE' THEN 'ABERTA'
            WHEN 'APROVADA' THEN 'EM_ATENDIMENTO'
            WHEN 'RECUSADA' THEN 'CANCELADA'
            ELSE status
        END
    """)
    op.alter_column(
        'Solicitacoes_Plantio', 'status',
        existing_type=sa.String(50), existing_nullable=False,
        server_default='ABERTA',
    )
    op.create_check_constraint(
        'ck_solicitacoes_plantio_status', 'Solicitacoes_Plantio',
        "status IN ('ABERTA', 'EM_ATENDIMENTO', 'ATENDIDA', 'CANCELADA')",
    )

    op.execute('DELETE FROM "Demandas" WHERE NOT ativo')
    op.drop_column('Demandas', 'ativo')
    op.drop_column('Demandas', 'deletado_em')
    op.add_column('Demandas', sa.Column('idempotency_key', sa.UUID(), nullable=True))
    op.create_unique_constraint('uq_demandas_idempotency', 'Demandas', ['horta_id', 'idempotency_key'])


def downgrade() -> None:
    op.drop_constraint('uq_demandas_idempotency', 'Demandas', type_='unique')
    op.drop_column('Demandas', 'idempotency_key')
    op.add_column('Demandas', sa.Column('deletado_em', sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        'Demandas',
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column('Demandas', 'ativo', server_default=None)

    op.drop_constraint('ck_solicitacoes_plantio_status', 'Solicitacoes_Plantio', type_='check')
    op.execute("""
        UPDATE "Solicitacoes_Plantio" SET status = CASE status
            WHEN 'ABERTA' THEN 'PENDENTE'
            WHEN 'EM_ATENDIMENTO' THEN 'APROVADA'
            WHEN 'ATENDIDA' THEN 'APROVADA'
            WHEN 'CANCELADA' THEN 'RECUSADA'
            ELSE status
        END
    """)
    op.alter_column(
        'Solicitacoes_Plantio', 'status',
        existing_type=sa.String(50), existing_nullable=False,
        server_default='PENDENTE',
    )
    op.create_check_constraint(
        'ck_solicitacoes_plantio_status', 'Solicitacoes_Plantio',
        "status IN ('PENDENTE', 'APROVADA', 'RECUSADA')",
    )
