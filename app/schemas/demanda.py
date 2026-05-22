from pydantic import BaseModel, ConfigDict, Field
from enum import Enum
from typing import Optional

class StatusDemanda(str, Enum):
    ABERTA = "ABERTA"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    ATENDIDA = "ATENDIDA"
    CANCELADA = "CANCELADA"

class DemandaCreate(BaseModel):
    tipo_demanda: str
    descricao: str
    status: StatusDemanda
    quantidade: float = Field(..., gt=0, description="Quantidade solicitada (não pode ser zero ou negativa)")
    unidade_medida: str = Field(..., description="Ex: kg, unidades, litros")

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
