from typing import Optional, Literal
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class FonteAgua(str, Enum):
    PLUVIAL = "pluvial"
    REDE = "rede"
    POCO = "poco"
    OUTRO = "outro"


class TipoSolo(str, Enum):
    ARGILOSO = "argiloso"
    ARENOSO = "arenoso"
    HUMOSO = "humoso"
    MISTO = "misto"


class NivelVulnerabilidade(str, Enum):
    ALTO = "alto"
    MEDIO = "medio"
    BAIXO = "baixo"


class HortaCreate(BaseModel):
    nome: str
    rua: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_total: float
    publico_atendido: Optional[str] = None
    tem_cisterna: Optional[bool] = None
    fonte_agua: Optional[FonteAgua] = None
    tipo_solo: Optional[TipoSolo] = None
    area_permeavel: Optional[float] = Field(None, ge=0, le=100)
    nivel_vulnerabilidade: Optional[NivelVulnerabilidade] = None


class HortaPublica(BaseModel):
    id: int
    nome: str
    rua: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_total: float
    publico_atendido: Optional[str] = None
    tem_cisterna: Optional[bool] = None
    fonte_agua: Optional[FonteAgua] = None
    tipo_solo: Optional[TipoSolo] = None
    area_permeavel: Optional[float] = None
    nivel_vulnerabilidade: Optional[NivelVulnerabilidade] = None

    model_config = ConfigDict(from_attributes=True)


# --- GeoJSON (RFC 7946) ---

class PontoGeografico(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float]  # [longitude, latitude]


class PropriedadesHorta(BaseModel):
    id: int
    nome: str
    rua: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    area_total: float
    publico_atendido: Optional[str] = None
    tem_cisterna: Optional[bool] = None
    fonte_agua: Optional[FonteAgua] = None
    tipo_solo: Optional[TipoSolo] = None
    area_permeavel: Optional[float] = None
    nivel_vulnerabilidade: Optional[NivelVulnerabilidade] = None


class HortaFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: PontoGeografico
    properties: PropriedadesHorta


class HortaFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[HortaFeature]


# --- Mapa Completo (hortas + situação de risco calculada via PostGIS) ---

class SituacaoHorta(str, Enum):
    DENTRO        = "dentro"        # dentro de uma zona de risco
    ALERTA        = "alerta"        # até 1km da borda da zona
    MONITORAMENTO = "monitoramento" # entre 1km e 4km da borda da zona
    SEGURA        = "segura"        # além de 4km de qualquer zona


class ZonaRiscoResumida(BaseModel):
    id: int
    tipo: str
    nivel: str


class PropriedadesHortaCompleta(PropriedadesHorta):
    situacao: SituacaoHorta
    zona_risco: Optional[ZonaRiscoResumida] = None


class HortaCompletaFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: PontoGeografico
    properties: PropriedadesHortaCompleta


class HortaCompletaFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[HortaCompletaFeature]
