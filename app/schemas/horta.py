from typing import Optional, Literal, List
from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.database.enums import (
    FonteAgua, PraticaCultivo, TipoSolo, NivelVulnerabilidade,
)
from app.schemas.usuario import UsuarioReadCompleto, _validar_cpf_str


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
    praticas_cultivo: Optional[List[PraticaCultivo]] = None


class HortaUpdate(BaseModel):
    nome: Optional[str] = None
    rua: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_total: Optional[float] = None
    publico_atendido: Optional[str] = None
    tem_cisterna: Optional[bool] = None
    fonte_agua: Optional[FonteAgua] = None
    tipo_solo: Optional[TipoSolo] = None
    area_permeavel: Optional[float] = Field(None, ge=0, le=100)
    nivel_vulnerabilidade: Optional[NivelVulnerabilidade] = None
    praticas_cultivo: Optional[List[PraticaCultivo]] = None


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
    praticas_cultivo: Optional[List[PraticaCultivo]] = None
    indice_biodiversidade: int = 0

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
    praticas_cultivo: Optional[List[PraticaCultivo]] = None
    indice_biodiversidade: int = 0


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
    em_emergencia: bool = False


class HortaCompletaFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: PontoGeografico
    properties: PropriedadesHortaCompleta


class HortaCompletaFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[HortaCompletaFeature]


# --- Registro atômico de Horta + Líder (POST /hortas/registro) ---

class LiderRegistroCreate(BaseModel):
    """Dados do líder no registro atômico. SEM horta_id e SEM privilegio:
    ambos são definidos pelo servidor (horta_id = horta recém-criada,
    privilegio = LIDER_HORTA)."""
    nome: str
    email: EmailStr
    cpf: str
    telefone: str

    @field_validator("cpf")
    @classmethod
    def validar_cpf(cls, v: str) -> str:
        return _validar_cpf_str(v)


class HortaRegistroCreate(BaseModel):
    horta: HortaCreate
    lider: LiderRegistroCreate


class HortaRegistroRead(BaseModel):
    horta: HortaPublica
    lider: UsuarioReadCompleto
