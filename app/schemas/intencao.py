from pydantic import BaseModel, ConfigDict, field_validator
from datetime import date
from typing import Optional

from app.database.enums import StatusIntencao

class IntencaoCreate(BaseModel):
    produto_id: int
    justificativa_comunidade: Optional[str] = None
    data_desejada_plantio: Optional[date] = None
    status: StatusIntencao

    @field_validator('data_desejada_plantio')
    @classmethod
    def check_data_futura(cls, valor_data):
        if valor_data is not None and valor_data < date.today():
            raise ValueError('A data de plantio não pode estar no passado.')
        return valor_data


class IntencaoUpdate(BaseModel):
    produto_id: Optional[int] = None
    justificativa_comunidade: Optional[str] = None
    data_desejada_plantio: Optional[date] = None
    status: Optional[StatusIntencao] = None

    @field_validator('data_desejada_plantio')
    @classmethod
    def check_data_futura(cls, v):
        if v is not None and v < date.today():
            raise ValueError('A data de plantio não pode estar no passado.')
        return v


class IntencaoRead(BaseModel):
    id: int
    horta_id: int
    produto_id: Optional[int] = None
    justificativa_comunidade: Optional[str] = None
    data_desejada_plantio: Optional[date] = None
    status: StatusIntencao

    model_config = ConfigDict(from_attributes=True)
