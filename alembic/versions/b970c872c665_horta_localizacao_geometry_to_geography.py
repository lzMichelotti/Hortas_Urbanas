"""horta_localizacao_geometry_to_geography

Revision ID: b970c872c665
Revises: 4c3ba6aa62b6
Create Date: 2026-05-22 17:39:50.204118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b970c872c665'
down_revision: Union[str, Sequence[str], None] = '4c3ba6aa62b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove o índice GiST de Geometry antes de alterar o tipo
    op.execute('DROP INDEX IF EXISTS "Hortas_localizacao_idx"')
    # Converte a coluna para Geography (armazena em graus WGS84, distâncias em metros nativas)
    op.execute("""
        ALTER TABLE "Hortas"
        ALTER COLUMN localizacao TYPE geography(Point, 4326)
        USING localizacao::geometry::geography
    """)


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS "Hortas_localizacao_idx"')
    op.execute("""
        ALTER TABLE "Hortas"
        ALTER COLUMN localizacao TYPE geometry(Point, 4326)
        USING localizacao::geometry
    """)
