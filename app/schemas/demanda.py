from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

from app.database.enums import StatusDemanda

class DemandaCreate(BaseModel):
    tipo_demanda: str
    descricao: str
    status: StatusDemanda
    quantidade: float = Field(..., gt=0, description="Quantidade solicitada (não pode ser zero ou negativa)")
    unidade_medida: str = Field(..., description="Ex: kg, unidades, litros")

class DemandaUpdate(BaseModel):
    tipo_demanda: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[StatusDemanda] = None
    quantidade: Optional[float] = Field(None, gt=0)
    unidade_medida: Optional[str] = None


class DemandaUpdateStatus(BaseModel):
    status: StatusDemanda


class DemandaRead(BaseModel):
    id: int
    horta_id: int
    tipo_demanda: str
    descricao: str
    quantidade: float
    unidade_medida: str
    status: StatusDemanda
    ativo: bool

    model_config = ConfigDict(from_attributes=True)
