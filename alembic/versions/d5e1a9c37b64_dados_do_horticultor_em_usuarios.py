"""dados_do_horticultor_em_usuarios

Revision ID: d5e1a9c37b64
Revises: c7a1d8e34b52
Create Date: 2026-08-03 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5e1a9c37b64'
down_revision: Union[str, Sequence[str], None] = 'c7a1d8e34b52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('Usuarios', sa.Column('nascimento_ano', sa.SmallInteger(), nullable=True))
    op.add_column('Usuarios', sa.Column('sexo', sa.String(20), nullable=True))
    op.add_column('Usuarios', sa.Column('raca_cor', sa.String(20), nullable=True))
    op.add_column('Usuarios', sa.Column('grupo_familiar', sa.SmallInteger(), nullable=True))

    op.create_check_constraint(
        'ck_usuarios_sexo', 'Usuarios', "sexo IN ('FEMININO', 'MASCULINO', 'OUTRO')",
    )
    op.create_check_constraint(
        'ck_usuarios_raca_cor', 'Usuarios',
        "raca_cor IN ('BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA')",
    )
    op.create_check_constraint(
        'ck_usuarios_nascimento_ano', 'Usuarios', 'nascimento_ano BETWEEN 1900 AND 2100',
    )
    op.create_check_constraint(
        'ck_usuarios_grupo_familiar', 'Usuarios', 'grupo_familiar BETWEEN 1 AND 30',
    )


def downgrade() -> None:
    op.drop_constraint('ck_usuarios_grupo_familiar', 'Usuarios', type_='check')
    op.drop_constraint('ck_usuarios_nascimento_ano', 'Usuarios', type_='check')
    op.drop_constraint('ck_usuarios_raca_cor', 'Usuarios', type_='check')
    op.drop_constraint('ck_usuarios_sexo', 'Usuarios', type_='check')

    op.drop_column('Usuarios', 'grupo_familiar')
    op.drop_column('Usuarios', 'raca_cor')
    op.drop_column('Usuarios', 'sexo')
    op.drop_column('Usuarios', 'nascimento_ano')
