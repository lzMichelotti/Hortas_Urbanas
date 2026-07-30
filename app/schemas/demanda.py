from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

from app.database.enums import StatusPedido


class DemandaCreate(BaseModel):
    tipo_demanda: str
    descricao: str
    quantidade: float = Field(..., gt=0, description="Quantidade solicitada (não pode ser zero ou negativa)")
    unidade_medida: str = Field(..., description="Ex: kg, unidades, litros")


class DemandaUpdateStatus(BaseModel):
    status: StatusPedido


class DemandaRead(BaseModel):
    id: int
    horta_id: int
    canteiro_id: Optional[int] = None
    tipo_demanda: str
    descricao: str
    quantidade: float
    unidade_medida: str
    status: StatusPedido
    criado_em: datetime
    finalizado_em: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
