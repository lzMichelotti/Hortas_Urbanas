from pydantic import BaseModel, ConfigDict
from typing import Optional

class CanteiroCreate(BaseModel):
    usuario_id: Optional[int] = None
    identificacao: str
    area_produtiva: Optional[float] = None
    area_ociosa: Optional[float] = None

class CanteiroUpdate(BaseModel):
    usuario_id: Optional[int] = None
    identificacao: Optional[str] = None
    area_produtiva: Optional[float] = None
    area_ociosa: Optional[float] = None


class CanteiroRead(CanteiroCreate):
    id: int
    horta_id: int
    model_config = ConfigDict(from_attributes=True)


class ProdutividadeCanteiro(BaseModel):
    canteiro_id: int
    identificacao: str
    responsavel: Optional[str] = None   # nome do dono do canteiro; None se vazio
    plantadas: int
    crescendo: int
    prontas: int
    colheitas: int        # nº de ciclos COLHIDO
    colhido_total: int    # soma de `quantidade` dos COLHIDO (unidades)
    perdas: int           # nº de ciclos PERDIDO
