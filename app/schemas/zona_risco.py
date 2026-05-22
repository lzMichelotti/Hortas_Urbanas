from typing import Optional, Literal
from enum import Enum
from pydantic import BaseModel, ConfigDict


class TipoZona(str, Enum):
    ALAGAMENTO = "alagamento"
    EROSAO = "erosao"
    DESLIZAMENTO = "deslizamento"
    OUTRO = "outro"


class NivelRisco(str, Enum):
    ALTO = "alto"
    MEDIO = "medio"
    BAIXO = "baixo"


class ZonaRiscoCreate(BaseModel):
    nome: str
    tipo: TipoZona
    nivel: NivelRisco
    descricao: Optional[str] = None
    coordinates: list[list[float]]  # [[lng, lat], ...] — padrão de anel linear


class ZonaRiscoPublica(BaseModel):
    id: int
    nome: str
    tipo: TipoZona
    nivel: NivelRisco
    descricao: Optional[str] = None
    coordinates: Optional[list[list[float]]] = None

    model_config = ConfigDict(from_attributes=True)


# --- GeoJSON (RFC 7946) ---

class PoligonoGeografico(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: list[list[list[float]]]  # [anel_externo] → [[lng, lat], ...]


class PropriedadesZonaRisco(BaseModel):
    id: int
    nome: str
    tipo: TipoZona
    nivel: NivelRisco
    descricao: Optional[str] = None


class ZonaRiscoFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: PoligonoGeografico
    properties: PropriedadesZonaRisco


class ZonaRiscoFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[ZonaRiscoFeature]
