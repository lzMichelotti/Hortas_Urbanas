"""soft_delete_horta_canteiro_ciclo

Revision ID: c8493ef9a3fc
Revises: 5bf475ab2a74
Create Date: 2026-05-25 21:28:38.211140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8493ef9a3fc'
down_revision: Union[str, Sequence[str], None] = '5bf475ab2a74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TABELAS = ("Hortas", "Canteiros", "Ciclos_Producao")


def upgrade() -> None:
    # ADD COLUMN com DEFAULT em Postgres 11+ é instantâneo (não reescreve a tabela inteira).
    # Ref: postgresql.org/docs/15/sql-altertable.html — "When a column is added with ADD COLUMN
    # and a non-volatile DEFAULT is specified, the default is evaluated at the time of the
    # statement and the result stored in the table's metadata."
    for tabela in _TABELAS:
        op.add_column(
            tabela,
            sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
        op.add_column(
            tabela,
            sa.Column("deletado_em", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    for tabela in _TABELAS:
        op.drop_column(tabela, "deletado_em")
        op.drop_column(tabela, "ativo")
