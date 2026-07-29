"""add_motivo_perda_ciclo

Revision ID: a3f7c2b91d04
Revises: ef8c899750c9
Create Date: 2026-07-26 10:00:00.000000

Registra por que um ciclo se perdeu: motivo (vocabulário controlado), observação
livre curta (só quando motivo = OUTRO) e a data da perda — é `perdido_em` que
permite cruzar a perda com o evento climático.

Colunas nullable sem default não reescrevem a tabela; os CHECKs exigem um scan
(tabela pequena). Ref: postgresql.org/docs/16/sql-altertable.html#SQL-ALTERTABLE-NOTES
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3f7c2b91d04'
down_revision: Union[str, Sequence[str], None] = 'ef8c899750c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('Ciclos_Producao', sa.Column('motivo_perda', sa.String(length=50), nullable=True))
    op.add_column('Ciclos_Producao', sa.Column('observacao_perda', sa.String(length=140), nullable=True))
    op.add_column('Ciclos_Producao', sa.Column('perdido_em', sa.Date(), nullable=True))

    op.create_check_constraint(
        'ck_ciclos_producao_motivo_perda',
        'Ciclos_Producao',
        "motivo_perda IN ('GEADA','SECA','CHUVA_EXCESSO','CALOR','PRAGA','ANIMAIS','FURTO','OUTRO')",
    )
    op.create_check_constraint(
        'ck_ciclos_producao_perdido_em',
        'Ciclos_Producao',
        'perdido_em >= data_plantio',
    )


def downgrade() -> None:
    op.drop_constraint('ck_ciclos_producao_perdido_em', 'Ciclos_Producao', type_='check')
    op.drop_constraint('ck_ciclos_producao_motivo_perda', 'Ciclos_Producao', type_='check')
    op.drop_column('Ciclos_Producao', 'perdido_em')
    op.drop_column('Ciclos_Producao', 'observacao_perda')
    op.drop_column('Ciclos_Producao', 'motivo_perda')
