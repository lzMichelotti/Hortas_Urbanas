from pydantic import BaseModel


class ClimaAtual(BaseModel):
    temperatura: float
    sensacao: float
    codigo: int
    vento: float


class ClimaDia(BaseModel):
    data: str
    codigo: int
    temp_max: float
    temp_min: float
    chuva_mm: float
    chance_chuva: int | None = None   # pode vir nulo da API
    uv_max: float | None = None       # pode vir nulo da API
    vento_max: float


class ClimaResposta(BaseModel):
    atual: ClimaAtual
    dias: list[ClimaDia]
