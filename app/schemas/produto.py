from pydantic import BaseModel, ConfigDict
from typing import Optional


class ProdutoRead(BaseModel):
    id: int
    nome: str
    categoria: Optional[str] = None
    da_em_arvore: Optional[bool] = None
    necessita_replantio: Optional[bool] = None
    epoca_recomendada: Optional[str] = None
    inicio_colheita: Optional[str] = None
    ativo: bool

    model_config = ConfigDict(from_attributes=True)
