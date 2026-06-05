"""add_gist_indexes_geoespacial

Revision ID: 801c7ecc4544
Revises: b970c872c665
Create Date: 2026-05-25 11:02:58.152382

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '801c7ecc4544'
down_revision: Union[str, Sequence[str], None] = 'b970c872c665'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # GeoAlchemy2 cria esses índices automaticamente via create_all com o padrão
    # "idx_{Tabela}_{coluna}". Esta migration os registra explicitamente no histórico
    # do Alembic para que novos ambientes (alembic upgrade head do zero) também os tenham.
    op.execute('CREATE INDEX IF NOT EXISTS "idx_Hortas_localizacao" ON "Hortas" USING GIST(localizacao)')
    op.execute('CREATE INDEX IF NOT EXISTS "idx_Zonas_Risco_area" ON "Zonas_Risco" USING GIST(area)')


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS "idx_Hortas_localizacao"')
    op.execute('DROP INDEX IF EXISTS "idx_Zonas_Risco_area"')
