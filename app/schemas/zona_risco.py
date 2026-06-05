from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.database.enums import TipoZona, NivelRisco


class ZonaRiscoCreate(BaseModel):
    nome: str
    tipo: TipoZona
    nivel: NivelRisco
    descricao: Optional[str] = None
    coordinates: list[list[float]]  # [[lng, lat], ...] — padrão de anel linear


class ZonaRiscoStatusUpdate(BaseModel):
    ativa: bool
    data_ocorrencia: Optional[datetime] = None
    data_fim: Optional[datetime] = None


# --- GeoJSON (RFC 7946) ---

class PoligonoGeografico(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: list[list[list[float]]]  # [anel_externo] → [[lng, lat], ...]


class ZonaRiscoPublica(BaseModel):
    id: int
    nome: str
    tipo: TipoZona
    nivel: NivelRisco
    descricao: Optional[str] = None
    geometry: Optional[PoligonoGeografico] = None
    ativa: bool = True
    data_ocorrencia: Optional[datetime] = None
    data_fim: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PropriedadesZonaRisco(BaseModel):
    id: int
    nome: str
    tipo: TipoZona
    nivel: NivelRisco
    descricao: Optional[str] = None
    ativa: bool = True
    data_ocorrencia: Optional[datetime] = None
    data_fim: Optional[datetime] = None


class ZonaRiscoFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: PoligonoGeografico
    properties: PropriedadesZonaRisco


class ZonaRiscoFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[ZonaRiscoFeature]
