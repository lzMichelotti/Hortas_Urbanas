from pydantic import BaseModel, ConfigDict, field_validator
from datetime import date
from typing import Optional

from app.database.enums import StatusSolicitacao


class SolicitacaoCreate(BaseModel):
    produto_id: int
    justificativa: Optional[str] = None
    data_desejada_plantio: Optional[date] = None

    @field_validator('data_desejada_plantio')
    @classmethod
    def check_data_futura(cls, valor_data):
        if valor_data is not None and valor_data < date.today():
            raise ValueError('A data de plantio não pode estar no passado.')
        return valor_data


class SolicitacaoUpdateStatus(BaseModel):
    status: StatusSolicitacao


class SolicitacaoRead(BaseModel):
    id: int
    canteiro_id: int
    produto_id: Optional[int] = None
    justificativa: Optional[str] = None
    data_desejada_plantio: Optional[date] = None
    status: StatusSolicitacao

    model_config = ConfigDict(from_attributes=True)
