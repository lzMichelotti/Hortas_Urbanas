from typing import Optional
from pydantic import BaseModel, ConfigDict

class CanteiroCreate(BaseModel):
    usuario_id: Optional[int] = None 
    identificacao: str
    area_produtiva: float
    area_ociosa: float


class CanteiroUpdate(BaseModel):
    usuario_id: Optional[int] = None
    identificacao: Optional[str] = None
    area_produtiva: Optional[float] = None
    area_ociosa: Optional[float] = None


class CanteiroRead(BaseModel):
    id: int
    horta_id: int
    usuario_id: Optional[int] = None
    identificacao: str
    area_produtiva: Optional[float] = None
    area_ociosa: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)
