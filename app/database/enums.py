"""Enums de domínio — fonte única de verdade para valores válidos.

Reutilizado em:
- `app/database/models.py` (gera CHECK constraints via `enum_check`)
- `app/schemas/*.py` (validação Pydantic na API)
- Futuras migrations Alembic que precisem das listas
"""
from enum import Enum
from sqlalchemy import CheckConstraint


# --- Horta ---

class FonteAgua(str, Enum):
    PLUVIAL = "pluvial"
    REDE    = "rede"
    POCO    = "poco"
    OUTRO   = "outro"


class TipoSolo(str, Enum):
    ARGILOSO = "argiloso"
    ARENOSO  = "arenoso"
    HUMOSO   = "humoso"
    MISTO    = "misto"


class NivelVulnerabilidade(str, Enum):
    ALTO  = "alto"
    MEDIO = "medio"
    BAIXO = "baixo"


class PraticaCultivo(str, Enum):
    COMPOSTAGEM          = "compostagem"
    IRRIGACAO_GOTEJAMENTO = "irrigacao_gotejamento"
    CAPTACAO_AGUA_CHUVA  = "captacao_agua_chuva"
    CONTROLE_BIOLOGICO   = "controle_biologico"
    ADUBACAO_VERDE       = "adubacao_verde"
    ROTACAO_CULTURAS     = "rotacao_culturas"
    SEM_AGROTOXICOS      = "sem_agrotoxicos"
    MULCHING             = "mulching"


# --- Zona de Risco ---

class TipoZona(str, Enum):
    ALAGAMENTO   = "alagamento"
    ENXURRADA    = "enxurrada"
    EROSAO       = "erosao"
    DESLIZAMENTO = "deslizamento"
    QUEDA        = "queda"
    OUTRO        = "outro"


class NivelRisco(str, Enum):
    ALTO  = "alto"
    MEDIO = "medio"
    BAIXO = "baixo"


# --- Usuário ---

class Privilegio(str, Enum):
    ADMIN_SUPREMO   = "ADMIN_SUPREMO"
    LIDER_HORTA     = "LIDER_HORTA"
    MEMBRO_CANTEIRO = "MEMBRO_CANTEIRO"


class Sexo(str, Enum):
    FEMININO  = "FEMININO"
    MASCULINO = "MASCULINO"
    OUTRO     = "OUTRO"


# Categorias do IBGE (Censo/PNAD) — mudar quebra a comparação com as bases oficiais.
class RacaCor(str, Enum):
    BRANCA   = "BRANCA"
    PRETA    = "PRETA"
    PARDA    = "PARDA"
    AMARELA  = "AMARELA"
    INDIGENA = "INDIGENA"


# --- Fluxos de Plantio / Demanda ---

class StatusCiclo(str, Enum):
    PLANTADO             = "PLANTADO"
    EM_CRESCIMENTO       = "EM_CRESCIMENTO"
    PRONTO_PARA_COLHEITA = "PRONTO_PARA_COLHEITA"
    COLHIDO              = "COLHIDO"
    PERDIDO              = "PERDIDO"


class MotivoPerda(str, Enum):
    GEADA         = "GEADA"
    SECA          = "SECA"
    CHUVA_EXCESSO = "CHUVA_EXCESSO"
    CALOR         = "CALOR"
    PRAGA         = "PRAGA"
    ANIMAIS       = "ANIMAIS"
    FURTO         = "FURTO"
    OUTRO         = "OUTRO"


# Recorte climático das perdas — o dado que a pesquisa de resiliência busca.
MOTIVOS_CLIMATICOS = frozenset({
    MotivoPerda.GEADA, MotivoPerda.SECA, MotivoPerda.CHUVA_EXCESSO, MotivoPerda.CALOR,
})


class StatusIntencao(str, Enum):
    PLANEJADO            = "PLANEJADO"
    AGUARDANDO_SEMENTES  = "AGUARDANDO_SEMENTES"
    EM_PLANTIO           = "EM_PLANTIO"
    CONCLUIDO            = "CONCLUIDO"


class StatusPedido(str, Enum):
    ABERTA          = "ABERTA"
    EM_ATENDIMENTO  = "EM_ATENDIMENTO"
    ATENDIDA        = "ATENDIDA"
    CANCELADA       = "CANCELADA"


# --- Fórum ---

class TipoPost(str, Enum):
    AJUDA  = "AJUDA"
    TROCAS = "TROCAS"
    AVISOS = "AVISOS"


# --- Helper para CHECK constraints ---

def enum_check(coluna: str, enum_class: type[Enum], *, name: str) -> CheckConstraint:
    """Gera um CheckConstraint do tipo `coluna IN ('a','b',...)` a partir de uma Enum.

    Em PostgreSQL, CHECK satisfaz NULL implicitamente — para colunas nullable basta
    `coluna IN (...)`, sem precisar de `IS NULL OR`.
    Ref: postgresql.org/docs/15/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS
    """
    escapados = ", ".join("'" + v.value.replace("'", "''") + "'" for v in enum_class)
    return CheckConstraint(f"{coluna} IN ({escapados})", name=name)
