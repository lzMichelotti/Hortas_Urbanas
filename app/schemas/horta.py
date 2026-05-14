from pydantic import BaseModel
from typing import Optional

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

    model_config = {"from_attributes": True}

# GeoJSON (RFC 7946) — padrão consumido por Leaflet, Mapbox, etc.
class PontoGeografico(BaseModel):
    type: str = "Point"
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

class HortaFeature(BaseModel):
    type: str = "Feature"
    geometry: PontoGeografico
    properties: PropriedadesHorta

class HortaFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[HortaFeature]
