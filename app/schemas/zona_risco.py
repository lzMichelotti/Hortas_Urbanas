from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

from app.database.enums import TipoZona, NivelRisco


class ZonaRiscoCreate(BaseModel):
    nome: str
    tipo: TipoZona
    nivel: NivelRisco
    descricao: Optional[str] = None
    coordinates: list[list[float]]  # [[lng, lat], ...] — padrão de anel linear

    @field_validator("coordinates")
    @classmethod
    def validar_anel(cls, coords: list[list[float]]) -> list[list[float]]:
        for ponto in coords:
            if len(ponto) != 2:
                raise ValueError("Cada ponto precisa de longitude e latitude.")
            lng, lat = ponto
            if not -180 <= lng <= 180:
                raise ValueError("Longitude fora do intervalo de -180 a 180.")
            if not -90 <= lat <= 90:
                raise ValueError("Latitude fora do intervalo de -90 a 90.")
        aberto = coords[:-1] if len(coords) > 1 and coords[0] == coords[-1] else coords
        if len({tuple(p) for p in aberto}) < 3:
            raise ValueError("O desenho da zona precisa de pelo menos 3 pontos diferentes.")
        return coords


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
