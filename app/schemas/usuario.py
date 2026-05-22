from typing import Optional
from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from validate_docbr import CPF as CpfValidator

_cpf = CpfValidator()


class Privilegio(str, Enum):
    ADMIN_SUPREMO = "ADMIN_SUPREMO"
    LIDER_HORTA = "LIDER_HORTA"
    MEMBRO_CANTEIRO = "MEMBRO_CANTEIRO"


def _validar_cpf_str(v: str) -> str:
    if not _cpf.validate(v):
        raise ValueError("CPF inválido")
    return "".join(filter(str.isdigit, v))


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    cpf: str
    telefone: str
    privilegio: Privilegio
    horta_id: Optional[int] = None

    @field_validator("cpf")
    @classmethod
    def validar_cpf(cls, v: str) -> str:
        return _validar_cpf_str(v)


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    privilegio: Optional[Privilegio] = None
    horta_id: Optional[int] = None

    @field_validator("cpf")
    @classmethod
    def validar_cpf(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validar_cpf_str(v)
        return v


class UsuarioRead(BaseModel):
    id: int
    nome: str
    email: EmailStr
    cpf: str
    telefone: str
    privilegio: Privilegio
    horta_id: Optional[int] = None
    ativo: bool

    model_config = ConfigDict(from_attributes=True)
