from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from validate_docbr import CPF as CpfValidator
from typing import Optional

_cpf = CpfValidator()

class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    cpf: str
    telefone: str
    privilegio: str
    horta_id: Optional[int] = None

    @field_validator('cpf')
    @classmethod
    def validar_cpf(cls, v: str) -> str:
        if not _cpf.validate(v):
            raise ValueError('CPF inválido')
        return ''.join(filter(str.isdigit, v))

class UsuarioRead(BaseModel):
    id: int
    nome: str
    email: str
    cpf: str
    telefone: str
    privilegio: str
    horta_id: Optional[int] = None
    ativo: bool
    model_config = ConfigDict(from_attributes=True)
