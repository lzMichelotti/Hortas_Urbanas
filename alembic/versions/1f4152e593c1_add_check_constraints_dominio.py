"""add_check_constraints_dominio

Revision ID: 1f4152e593c1
Revises: 03606d5df9b7
Create Date: 2026-05-25 21:09:54.040810

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f4152e593c1'
down_revision: Union[str, Sequence[str], None] = '03606d5df9b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1.1 — Enumerações de domínio (status, tipo, nivel, privilégio etc.)
    # PostgreSQL: CHECK aceita NULL implicitamente (expressão x IN (...) com x=NULL retorna NULL),
    # por isso colunas nullable não precisam de "IS NULL OR" — docs/15/ddl-constraints.html
    op.create_check_constraint(
        "ck_hortas_fonte_agua", "Hortas",
        "fonte_agua IN ('pluvial','rede','poco','outro')",
    )
    op.create_check_constraint(
        "ck_hortas_tipo_solo", "Hortas",
        "tipo_solo IN ('argiloso','arenoso','humoso','misto')",
    )
    op.create_check_constraint(
        "ck_hortas_nivel_vulnerabilidade", "Hortas",
        "nivel_vulnerabilidade IN ('alto','medio','baixo')",
    )
    op.create_check_constraint(
        "ck_zonas_risco_tipo", "Zonas_Risco",
        "tipo IN ('alagamento','enxurrada','erosao','deslizamento','queda','outro')",
    )
    op.create_check_constraint(
        "ck_zonas_risco_nivel", "Zonas_Risco",
        "nivel IN ('alto','medio','baixo')",
    )
    op.create_check_constraint(
        "ck_usuarios_privilegio", "Usuarios",
        "privilegio IN ('ADMIN_SUPREMO','LIDER_HORTA','MEMBRO_CANTEIRO')",
    )
    op.create_check_constraint(
        "ck_ciclos_producao_status", "Ciclos_Producao",
        "status IN ('PLANTADO','EM_CRESCIMENTO','PRONTO_PARA_COLHEITA','COLHIDO','PERDIDO')",
    )
    op.create_check_constraint(
        "ck_intencoes_plantio_status", "Intencoes_Plantio",
        "status IN ('PLANEJADO','AGUARDANDO_SEMENTES','EM_PLANTIO','CONCLUIDO')",
    )
    op.create_check_constraint(
        "ck_solicitacoes_plantio_status", "Solicitacoes_Plantio",
        "status IN ('PENDENTE','APROVADA','RECUSADA')",
    )
    op.create_check_constraint(
        "ck_demandas_status", "Demandas",
        "status IN ('ABERTA','EM_ATENDIMENTO','ATENDIDA','CANCELADA')",
    )

    # 1.3 — Coerência temporal: previsão de colheita após plantio
    op.create_check_constraint(
        "ck_ciclos_producao_datas", "Ciclos_Producao",
        "previsao_colheita > data_plantio",
    )

    # 1.4 — Quantidade de demanda estritamente positiva
    op.create_check_constraint(
        "ck_demandas_quantidade_positiva", "Demandas",
        "quantidade > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_demandas_quantidade_positiva", "Demandas", type_="check")
    op.drop_constraint("ck_ciclos_producao_datas", "Ciclos_Producao", type_="check")
    op.drop_constraint("ck_demandas_status", "Demandas", type_="check")
    op.drop_constraint("ck_solicitacoes_plantio_status", "Solicitacoes_Plantio", type_="check")
    op.drop_constraint("ck_intencoes_plantio_status", "Intencoes_Plantio", type_="check")
    op.drop_constraint("ck_ciclos_producao_status", "Ciclos_Producao", type_="check")
    op.drop_constraint("ck_usuarios_privilegio", "Usuarios", type_="check")
    op.drop_constraint("ck_zonas_risco_nivel", "Zonas_Risco", type_="check")
    op.drop_constraint("ck_zonas_risco_tipo", "Zonas_Risco", type_="check")
    op.drop_constraint("ck_hortas_nivel_vulnerabilidade", "Hortas", type_="check")
    op.drop_constraint("ck_hortas_tipo_solo", "Hortas", type_="check")
    op.drop_constraint("ck_hortas_fonte_agua", "Hortas", type_="check")
