from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import date
from typing import Optional

from app.core.config import hoje
from app.database.enums import StatusPedido


class SolicitacaoCreate(BaseModel):
    produto_id: int
    quantidade: int = Field(default=1, gt=0)
    justificativa: Optional[str] = None
    data_desejada_plantio: Optional[date] = None

    @field_validator('data_desejada_plantio')
    @classmethod
    def check_data_futura(cls, valor_data):
        if valor_data is not None and valor_data < hoje():
            raise ValueError('A data de plantio não pode estar no passado.')
        return valor_data


class SolicitacaoUpdateStatus(BaseModel):
    status: StatusPedido


class SolicitacaoRead(BaseModel):
    id: int
    canteiro_id: int
    produto_id: Optional[int] = None
    quantidade: int
    justificativa: Optional[str] = None
    data_desejada_plantio: Optional[date] = None
    status: StatusPedido

    model_config = ConfigDict(from_attributes=True)
