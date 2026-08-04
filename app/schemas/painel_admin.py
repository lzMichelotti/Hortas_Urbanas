from datetime import date
from typing import Optional

from pydantic import BaseModel

from app.schemas.horta import HortaPublica


# --- Panorama ---

class ResumoHortas(BaseModel):
    ativas: int
    sem_lider: int
    paradas: int          # nenhum plantio novo dentro da janela de inatividade


class ResumoCanteiros(BaseModel):
    ativos: int
    com_responsavel: int
    ociosos: int
    area_produtiva_m2: float
    area_ociosa_m2: float


class ResumoPessoas(BaseModel):
    membros: int
    lideres: int


class ResumoProducao(BaseModel):
    plantios: int
    colheitas: int        # nº de ciclos COLHIDO — sem soma de volume, `quantidade` não tem unidade
    perdas: int
    perdas_climaticas: int


class ResumoDemandas(BaseModel):
    """Mesmo universo de GET /demandas para o admin: pedido aberto pela horta ou
    pedido de canteiro que o líder encaminhou."""
    abertas: int
    em_atendimento: int


class Panorama(BaseModel):
    dias: int
    dias_sem_plantio: int
    hortas: ResumoHortas
    canteiros: ResumoCanteiros
    pessoas: ResumoPessoas
    producao: ResumoProducao
    demandas: ResumoDemandas


# --- Produção ---

class PontoSerie(BaseModel):
    mes: str              # "2026-05"
    plantios: int
    colheitas: int
    perdas: int


class ProducaoHorta(BaseModel):
    horta_id: int
    nome: str
    plantios: int
    colheitas: int
    perdas: int
    atrasados: int        # estado atual, não recorte do período


class PerdaPorMotivo(BaseModel):
    motivo: str
    climatico: bool
    total: int


class ProdutoNoPeriodo(BaseModel):
    produto_id: int
    nome: str
    plantios: int
    perdas: int


class Producao(BaseModel):
    desde: date
    ate: date
    serie_mensal: list[PontoSerie]
    por_horta: list[ProducaoHorta]
    perdas_por_motivo: list[PerdaPorMotivo]
    produtos: list[ProdutoNoPeriodo]


# --- Ficha da horta ---

class LiderResumo(BaseModel):
    id: int
    nome: str
    email: str
    telefone: str


class FichaHorta(BaseModel):
    dias: int
    horta: HortaPublica
    lider: Optional[LiderResumo] = None
    membros: int
    canteiros: ResumoCanteiros
    producao: ResumoProducao
    ultima_atividade: Optional[date] = None


# --- Perfil dos horticultores ---

class Fatia(BaseModel):
    """`n` vem nulo quando a contagem é pequena demais para ser publicada."""
    rotulo: str
    n: Optional[int] = None
    suprimido: bool = False


class PerfilHorticultores(BaseModel):
    total: int
    informaram: int
    limiar_supressao: int
    faixa_etaria: list[Fatia]
    sexo: list[Fatia]
    raca_cor: list[Fatia]
    grupo_familiar_medio: Optional[float] = None
    # Soma dos grupos familiares de quem informou — não extrapola para os demais.
    alcance_estimado: int
