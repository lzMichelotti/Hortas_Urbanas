"""estado_inicial

Revision ID: f04957d936ae
Revises: 
Create Date: 2026-05-22 10:24:02.717985

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision: str = 'f04957d936ae'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostGIS é necessário antes de criar colunas Geometry/Geography.
    # A imagem Docker postgis/postgis já habilita a extensão automaticamente,
    # mas este comando garante compatibilidade com instalações manuais do PostgreSQL.
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # Tabelas sem FK primeiro (Hortas, Zonas_Risco, Produtos)
    op.create_table(
        'Hortas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('rua', sa.String(255)),
        sa.Column('numero', sa.String(50)),
        sa.Column('bairro', sa.String(100)),
        sa.Column('cep', sa.String(20)),
        sa.Column('cidade', sa.String(100)),
        sa.Column('uf', sa.String(2)),
        sa.Column('localizacao', Geometry('POINT', srid=4326), nullable=True),
        sa.Column('area_total', sa.Float()),
        sa.Column('publico_atendido', sa.Text()),
        # Campos de resiliência climática adicionados em 87fb30218f89
    )

    op.create_table(
        'Zonas_Risco',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('tipo', sa.String(50), nullable=False),
        sa.Column('nivel', sa.String(20), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('area', Geometry('POLYGON', srid=4326), nullable=False),
    )

    op.create_table(
        'Produtos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('categoria', sa.String(50)),
        sa.Column('da_em_arvore', sa.Boolean()),
        sa.Column('necessita_replantio', sa.Boolean()),
        sa.Column('epoca_recomendada', sa.String(100)),
        sa.Column('inicio_colheita', sa.String(100)),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('deletado_em', sa.DateTime(), nullable=True),
    )

    # Usuarios depende de Hortas
    op.create_table(
        'Usuarios',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('horta_id', sa.Integer(), sa.ForeignKey('Hortas.id', ondelete='SET NULL'), nullable=True),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('cpf', sa.String(14), nullable=False, unique=True),
        sa.Column('senha_hash', sa.String(255), nullable=False),
        sa.Column('telefone', sa.String(20), nullable=False),
        sa.Column('privilegio', sa.String(50), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('deletado_em', sa.DateTime(), nullable=True),
    )

    # Canteiros depende de Hortas e Usuarios
    op.create_table(
        'Canteiros',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('horta_id', sa.Integer(), sa.ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('identificacao', sa.String(100), nullable=False),
        sa.Column('area_produtiva', sa.Float()),
        sa.Column('area_ociosa', sa.Float()),
    )

    # Ciclos_Producao depende de Canteiros e Produtos
    op.create_table(
        'Ciclos_Producao',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('canteiro_id', sa.Integer(), sa.ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=False),
        sa.Column('produto_id', sa.Integer(), sa.ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True),
        sa.Column('data_plantio', sa.Date()),
        sa.Column('previsao_colheita', sa.Date()),
        sa.Column('data_colheita_real', sa.Date(), nullable=True),
        sa.Column('status', sa.String(50)),
    )

    # Intencoes_Plantio depende de Hortas e Produtos
    op.create_table(
        'Intencoes_Plantio',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('horta_id', sa.Integer(), sa.ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('produto_id', sa.Integer(), sa.ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True),
        sa.Column('justificativa_comunidade', sa.Text()),
        sa.Column('data_desejada_plantio', sa.Date(), nullable=True),
        sa.Column('status', sa.String(50)),
    )

    # Solicitacoes_Plantio depende de Canteiros e Produtos
    op.create_table(
        'Solicitacoes_Plantio',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('canteiro_id', sa.Integer(), sa.ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=False),
        sa.Column('produto_id', sa.Integer(), sa.ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True),
        sa.Column('justificativa', sa.Text(), nullable=True),
        sa.Column('data_desejada_plantio', sa.Date(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='PENDENTE'),
    )

    # Demandas depende de Hortas
    op.create_table(
        'Demandas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('horta_id', sa.Integer(), sa.ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tipo_demanda', sa.String(50), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=False),
        sa.Column('quantidade', sa.Float(), nullable=False),
        sa.Column('unidade_medida', sa.String(20), nullable=False),
        sa.Column('status', sa.String(50)),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('deletado_em', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    # Drop na ordem inversa para respeitar as FKs
    op.drop_table('Demandas')
    op.drop_table('Solicitacoes_Plantio')
    op.drop_table('Intencoes_Plantio')
    op.drop_table('Ciclos_Producao')
    op.drop_table('Canteiros')
    op.drop_table('Usuarios')
    op.drop_table('Produtos')
    op.drop_table('Zonas_Risco')
    op.drop_table('Hortas')
