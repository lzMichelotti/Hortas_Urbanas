from pydantic import BaseModel, Field
from enum import Enum

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
