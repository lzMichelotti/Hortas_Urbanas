from pydantic import BaseModel
from datetime import date

class CicloCreate(BaseModel):
    produto_id: int
    data_plantio: date
    previsao_colheita: date
    status: str
