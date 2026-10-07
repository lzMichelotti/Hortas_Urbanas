from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional

from app.core.config import hoje
from app.database.enums import StatusPedido


class DemandaCreate(BaseModel):
    tipo_demanda: str
    descricao: str
    quantidade: float = Field(..., gt=0, description="Quantidade solicitada (não pode ser zero ou negativa)")
    unidade_medida: str = Field(..., description="Ex: kg, unidades, litros")


class PedidoUpdateStatus(BaseModel):
    """Vale para pedido de material e de planta. Sem `previsao_entrega` no corpo, a
    previsão atual fica como está; com `null`, é apagada."""
    status: StatusPedido
    previsao_entrega: Optional[date] = None

    @field_validator("previsao_entrega")
    @classmethod
    def check_previsao_futura(cls, valor):
        if valor is not None and valor < hoje():
            raise ValueError("A previsão de entrega não pode ser antes de hoje.")
        return valor


class DemandaUpdateEncaminhamento(BaseModel):
    encaminhada: bool


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
    encaminhada_em: Optional[datetime] = None
    previsao_entrega: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)
