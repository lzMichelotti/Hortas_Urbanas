"""add_tipo_em_posts

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-22 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'Posts',
        sa.Column('tipo', sa.String(20), nullable=False, server_default='AJUDA'),
    )
    op.create_check_constraint(
        'ck_posts_tipo', 'Posts', "tipo IN ('AJUDA', 'TROCAS', 'AVISOS')",
    )
    op.create_index('ix_Posts_tipo_id', 'Posts', ['tipo', 'id'])


def downgrade() -> None:
    op.drop_index('ix_Posts_tipo_id', table_name='Posts')
    op.drop_constraint('ck_posts_tipo', 'Posts', type_='check')
    op.drop_column('Posts', 'tipo')
