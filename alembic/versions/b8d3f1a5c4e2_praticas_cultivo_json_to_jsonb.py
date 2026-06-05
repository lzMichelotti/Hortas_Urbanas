"""praticas_cultivo_json_to_jsonb

Revision ID: b8d3f1a5c4e2
Revises: a7c2e9f4b3d1
Create Date: 2026-05-27 21:00:01.000000

Converte Hortas.praticas_cultivo de JSON para JSONB.

Motivo: JSONB armazena em forma binária decomposta — mais rápido para
processar e *indexável* (GIN). Permite consultas tipo
`praticas_cultivo @> '["captacao_agua_chuva"]'` no futuro.
Ref: https://www.postgresql.org/docs/current/datatype-json.html
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'b8d3f1a5c4e2'
down_revision: Union[str, Sequence[str], None] = 'a7c2e9f4b3d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE "Hortas"
        ALTER COLUMN praticas_cultivo TYPE jsonb
        USING praticas_cultivo::jsonb
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE "Hortas"
        ALTER COLUMN praticas_cultivo TYPE json
        USING praticas_cultivo::json
    """)
