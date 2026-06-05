"""fix_zona_risco_ativa_default_false

Revision ID: 03606d5df9b7
Revises: 667a84c09ffc
Create Date: 2026-05-25 19:21:02.062845

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '03606d5df9b7'
down_revision: Union[str, Sequence[str], None] = '667a84c09ffc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Corrige o server_default da coluna no schema do banco
    op.alter_column(
        'Zonas_Risco', 'ativa',
        server_default=sa.false(),
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )
    # Data migration: marca todos os registros históricos como inativos
    op.execute('UPDATE "Zonas_Risco" SET ativa = false')


def downgrade() -> None:
    op.alter_column(
        'Zonas_Risco', 'ativa',
        server_default=sa.true(),
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )
    op.execute('UPDATE "Zonas_Risco" SET ativa = true')
