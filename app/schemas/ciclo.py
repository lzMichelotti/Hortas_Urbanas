from pydantic import BaseModel, model_validator
from datetime import date
from typing import Optional
from enum import Enum

class StatusCiclo(str, Enum):
    PLANTADO = "PLANTADO"
    EM_CRESCIMENTO = "EM_CRESCIMENTO"
    PRONTO_PARA_COLHEITA = "PRONTO_PARA_COLHEITA"
    COLHIDO = "COLHIDO"
    PERDIDO = "PERDIDO"

class CicloCreate(BaseModel):
    produto_id: int
    data_plantio: date
    previsao_colheita: date
    data_colheita_real: Optional[date] = None
    status: StatusCiclo

    @model_validator(mode='after')
    def check_datas(self):
        if self.previsao_colheita <= self.data_plantio:
            raise ValueError('previsao_colheita deve ser posterior a data_plantio.')
        return self
