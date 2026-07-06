"""add_forum_posts_respostas_denuncias

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'Posts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('autor_id', sa.Integer(), sa.ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('conteudo', sa.Text(), nullable=False),
        sa.Column('imagem_path', sa.String(500), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_Posts_autor_id', 'Posts', ['autor_id'])

    op.create_table(
        'Respostas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('post_id', sa.Integer(), sa.ForeignKey('Posts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('autor_id', sa.Integer(), sa.ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('conteudo', sa.Text(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_Respostas_post_id', 'Respostas', ['post_id'])
    op.create_index('ix_Respostas_autor_id', 'Respostas', ['autor_id'])

    op.create_table(
        'Denuncias',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('post_id', sa.Integer(), sa.ForeignKey('Posts.id', ondelete='CASCADE'), nullable=True),
        sa.Column('resposta_id', sa.Integer(), sa.ForeignKey('Respostas.id', ondelete='CASCADE'), nullable=True),
        sa.Column('denunciante_id', sa.Integer(), sa.ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('motivo', sa.String(280), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint('num_nonnulls(post_id, resposta_id) = 1', name='ck_denuncias_alvo_unico'),
    )
    op.create_index('ix_Denuncias_post_id', 'Denuncias', ['post_id'])
    op.create_index('ix_Denuncias_resposta_id', 'Denuncias', ['resposta_id'])


def downgrade() -> None:
    op.drop_table('Denuncias')
    op.drop_table('Respostas')
    op.drop_table('Posts')
