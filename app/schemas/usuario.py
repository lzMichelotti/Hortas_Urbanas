from pydantic import BaseModel
from typing import Optional

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    cpf: str
    telefone: str
    privilegio: str
    horta_id: Optional[int] = None
