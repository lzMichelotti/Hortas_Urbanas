"""add_curtidas

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'Curtidas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['Posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['Usuarios.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('post_id', 'usuario_id', name='uq_curtidas_post_usuario'),
    )


def downgrade() -> None:
    op.drop_table('Curtidas')
