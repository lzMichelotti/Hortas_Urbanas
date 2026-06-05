from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator
from validate_docbr import CPF as CpfValidator

from app.database.enums import Privilegio

_cpf = CpfValidator()


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
    """Visão pública — CPF mascarado. Usar em listagens e edições por terceiros.
    CPF == credencial de login (decisão de produto); só pode ser exposto cheio
    para o próprio dono (/usuarios/me) ou em rotas administrativas auditadas."""
    id: int
    nome: str
    email: EmailStr
    cpf: str = Field(exclude=True)
    telefone: str
    privilegio: Privilegio
    horta_id: Optional[int] = None
    ativo: bool

    @computed_field
    @property
    def cpf_mascarado(self) -> str:
        return f"***.***.***-{self.cpf[-2:]}" if len(self.cpf) >= 2 else "***"

    model_config = ConfigDict(from_attributes=True)


class UsuarioReadCompleto(BaseModel):
    """CPF cheio — só para o próprio dono em /usuarios/me e para o criador
    em POST /usuarios (que acabou de digitar o valor)."""
    id: int
    nome: str
    email: EmailStr
    cpf: str
    telefone: str
    privilegio: Privilegio
    horta_id: Optional[int] = None
    ativo: bool

    model_config = ConfigDict(from_attributes=True)
