"""zona_risco_geometry_to_geography

Revision ID: a7c2e9f4b3d1
Revises: f668c868aaea
Create Date: 2026-05-27 21:00:00.000000

Converte Zonas_Risco.area de Geometry(POLYGON, 4326) para
Geography(POLYGON, 4326), em linha com Hortas.localizacao.

Motivo: enquanto as duas colunas tinham tipos diferentes, todas as queries
de cruzamento precisavam de `cast(..., Geography)` ou `cast(..., Geometry)`
por linha — o que invalida o índice GiST do lado castado. Com ambas em
Geography, ST_DWithin / ST_Covers funcionam nativamente nos dois lados
e os dois índices ficam usáveis sem cast.

Funções geography suportadas (PostGIS workshops, "Geography"):
ST_Distance, ST_DWithin, ST_Intersects, ST_Covers, ST_CoveredBy,
ST_Area, ST_Length, ST_Buffer, ST_Intersection.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a7c2e9f4b3d1'
down_revision: Union[str, Sequence[str], None] = 'f668c868aaea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Índice GiST atual está sobre geometry — precisa cair antes do ALTER TYPE.
    op.execute('DROP INDEX IF EXISTS "idx_Zonas_Risco_area"')

    # Conversão dupla: geometry → geography. Em SRID 4326 a representação
    # interna é compatível, mas o ALTER TYPE pede uma expressão USING.
    op.execute("""
        ALTER TABLE "Zonas_Risco"
        ALTER COLUMN area TYPE geography(Polygon, 4326)
        USING area::geography
    """)

    # GiST sobre geography — mesma sintaxe do índice anterior.
    op.execute(
        'CREATE INDEX "idx_Zonas_Risco_area" '
        'ON "Zonas_Risco" USING GIST(area)'
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS "idx_Zonas_Risco_area"')
    op.execute("""
        ALTER TABLE "Zonas_Risco"
        ALTER COLUMN area TYPE geometry(Polygon, 4326)
        USING area::geometry
    """)
    op.execute(
        'CREATE INDEX "idx_Zonas_Risco_area" '
        'ON "Zonas_Risco" USING GIST(area)'
    )
