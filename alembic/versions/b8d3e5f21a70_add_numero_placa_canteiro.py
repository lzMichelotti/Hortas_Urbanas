"""add_numero_placa_canteiro

Revision ID: b8d3e5f21a70
Revises: a3f7c2b91d04
Create Date: 2026-07-30 10:00:00.000000

Número da placa do canteiro — as placas existem fisicamente na horta, então o
número é escolhido pelo líder e não pode mudar sozinho ao criar/apagar canteiros.

A unicidade é parcial (só entre canteiros ativos): o delete é lógico, e sem o
WHERE um canteiro apagado seguraria o número para sempre.
Ref: postgresql.org/docs/16/indexes-partial.html

Nenhum dos passos reescreve a tabela; SET NOT NULL e o CHECK apenas varrem para
conferir. Ref: postgresql.org/docs/16/sql-altertable.html#SQL-ALTERTABLE-NOTES
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8d3e5f21a70'
down_revision: Union[str, Sequence[str], None] = 'a3f7c2b91d04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('Canteiros', sa.Column('numero', sa.Integer(), nullable=True))

    # Número provisório só para o SET NOT NULL passar: o id nunca se repete e é
    # sempre positivo, então satisfaz as duas regras abaixo. O líder renumera na tela.
    op.execute('UPDATE "Canteiros" SET numero = id')

    op.alter_column('Canteiros', 'numero', existing_type=sa.Integer(), nullable=False)
    op.create_check_constraint('ck_canteiros_numero_positivo', 'Canteiros', 'numero > 0')
    op.create_index(
        'uq_canteiros_horta_numero_ativo',
        'Canteiros',
        ['horta_id', 'numero'],
        unique=True,
        postgresql_where=sa.text('ativo'),
    )


def downgrade() -> None:
    op.drop_index('uq_canteiros_horta_numero_ativo', table_name='Canteiros')
    op.drop_constraint('ck_canteiros_numero_positivo', 'Canteiros', type_='check')
    op.drop_column('Canteiros', 'numero')
