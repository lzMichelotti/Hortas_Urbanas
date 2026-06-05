"""datetime_to_timestamptz

Revision ID: 5bf475ab2a74
Revises: 1f4152e593c1
Create Date: 2026-05-25 21:22:57.375447

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bf475ab2a74'
down_revision: Union[str, Sequence[str], None] = '1f4152e593c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_COLUNAS_DATETIME = [
    ("Zonas_Risco", "data_ocorrencia"),
    ("Zonas_Risco", "data_fim"),
    ("Usuarios",    "deletado_em"),
    ("Produtos",    "deletado_em"),
    ("Demandas",    "deletado_em"),
]


def upgrade() -> None:
    # Converte timestamp → timestamptz assumindo dados existentes em UTC.
    # USING ... AT TIME ZONE 'UTC' reinterpreta o naive datetime como UTC e armazena com TZ.
    # Ref: postgresql.org/docs/15/datatype-datetime.html#DATATYPE-TIMEZONES
    for tabela, coluna in _COLUNAS_DATETIME:
        op.alter_column(
            tabela, coluna,
            type_=sa.DateTime(timezone=True),
            existing_type=sa.DateTime(),
            existing_nullable=True,
            postgresql_using=f'"{coluna}" AT TIME ZONE \'UTC\'',
        )


def downgrade() -> None:
    # Volta a timestamp sem TZ; explicita 'UTC' no USING para não depender do TimeZone do servidor.
    for tabela, coluna in _COLUNAS_DATETIME:
        op.alter_column(
            tabela, coluna,
            type_=sa.DateTime(),
            existing_type=sa.DateTime(timezone=True),
            existing_nullable=True,
            postgresql_using=f'"{coluna}" AT TIME ZONE \'UTC\'',
        )
