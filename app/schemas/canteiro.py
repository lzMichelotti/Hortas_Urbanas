from pydantic import BaseModel
from typing import Optional

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
