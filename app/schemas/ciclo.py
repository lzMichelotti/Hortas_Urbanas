from pydantic import BaseModel, ConfigDict, Field, model_validator
from datetime import date
from typing import Optional

from app.database.enums import StatusCiclo

class CicloCreate(BaseModel):
    produto_id: int
    data_plantio: date
    previsao_colheita: date
    data_colheita_real: Optional[date] = None
    status: StatusCiclo
    quantidade: Optional[int] = Field(default=None, gt=0)

    @model_validator(mode='after')
    def check_datas(self):
        if self.previsao_colheita <= self.data_plantio:
            raise ValueError('previsao_colheita deve ser posterior a data_plantio.')
        return self


class CicloUpdate(BaseModel):
    produto_id: Optional[int] = None
    data_plantio: Optional[date] = None
    previsao_colheita: Optional[date] = None
    data_colheita_real: Optional[date] = None
    status: Optional[StatusCiclo] = None
    quantidade: Optional[int] = Field(default=None, gt=0)

    @model_validator(mode='after')
    def check_datas(self):
        # Só valida cross-field quando os dois lados são enviados juntos.
        # Se só um vier, a CheckConstraint do banco protege a consistência.
        if self.data_plantio is not None and self.previsao_colheita is not None:
            if self.previsao_colheita <= self.data_plantio:
                raise ValueError('previsao_colheita deve ser posterior a data_plantio.')
        return self


class CicloRead(BaseModel):
    id: int
    canteiro_id: int
    produto_id: Optional[int] = None
    data_plantio: date
    previsao_colheita: date
    data_colheita_real: Optional[date] = None
    status: StatusCiclo
    quantidade: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
