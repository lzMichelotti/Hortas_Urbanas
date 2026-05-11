from pydantic import BaseModel, ConfigDict
from typing import Optional

class CanteiroCreate(BaseModel):
    usuario_id: Optional[int] = None
    identificacao: str
    area_produtiva: Optional[float] = None
    area_ociosa: Optional[float] = None

class CanteiroRead(CanteiroCreate):
    id: int
    horta_id: int
    model_config = ConfigDict(from_attributes=True)
