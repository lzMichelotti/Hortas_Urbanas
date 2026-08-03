from datetime import date
from typing import Annotated, Optional
from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator
from validate_docbr import CPF as CpfValidator

from app.database.enums import Privilegio, RacaCor, Sexo

_cpf = CpfValidator()

IDADE_MINIMA = 5
IDADE_MAXIMA = 120


def _validar_cpf_str(v: str) -> str:
    if not _cpf.validate(v):
        raise ValueError("CPF inválido")
    return "".join(filter(str.isdigit, v))


def _validar_ano_nascimento(v: int) -> int:
    ano_atual = date.today().year
    if not (ano_atual - IDADE_MAXIMA <= v <= ano_atual - IDADE_MINIMA):
        raise ValueError("Confira o ano de nascimento.")
    return v


AnoNascimento = Annotated[int, AfterValidator(_validar_ano_nascimento)]
GrupoFamiliar = Annotated[int, Field(ge=1, le=30)]
Avatar = Annotated[str, Field(min_length=1, max_length=30)]


class DadosHorticultor(BaseModel):
    """Perfil socioeconômico da pesquisa de AUP, na ENTRADA. Tudo autodeclarado e
    opcional — ausente/nulo é a resposta "prefiro não informar", não um erro."""
    nascimento_ano: Optional[AnoNascimento] = None
    sexo: Optional[Sexo] = None
    raca_cor: Optional[RacaCor] = None
    grupo_familiar: Optional[GrupoFamiliar] = None


class UsuarioCreate(DadosHorticultor):
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


class PerfilUpdate(DadosHorticultor):
    """PATCH /usuarios/me — o próprio dono edita foto e dados do horticultor.
    Campo ausente = não mexe; campo enviado como null = "prefiro não informar"."""
    avatar: Optional[Avatar] = None

    @field_validator("avatar")
    @classmethod
    def avatar_nao_nulo(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            raise ValueError("Escolha uma foto.")
        return v


class UsuarioRead(BaseModel):
    """Visão pública — CPF mascarado. Usar em listagens e edições por terceiros.
    CPF == credencial de login (decisão de produto); só pode ser exposto cheio
    para o próprio dono (/usuarios/me) ou em rotas administrativas auditadas.
    Os dados do horticultor ficam de fora: raça/cor é dado sensível (LGPD Art. 5º II)
    e nenhuma tela de listagem precisa deles."""
    id: int
    nome: str
    email: EmailStr
    cpf: str = Field(exclude=True)
    telefone: str
    privilegio: Privilegio
    avatar: str
    horta_id: Optional[int] = None
    ativo: bool

    @computed_field
    @property
    def cpf_mascarado(self) -> str:
        return f"***.***.***-{self.cpf[-2:]}" if len(self.cpf) >= 2 else "***"

    model_config = ConfigDict(from_attributes=True)


class UsuarioReadCompleto(BaseModel):
    """CPF cheio — só para o próprio dono em /usuarios/me e para o criador
    em POST /usuarios (que acabou de digitar o valor).

    Repete os campos do horticultor sem os validadores de entrada de propósito:
    a faixa de ano aceita é relativa ao ano corrente, e leitura não pode passar
    a falhar com o tempo por causa de um dado que já está gravado."""
    id: int
    nome: str
    email: EmailStr
    cpf: str
    telefone: str
    privilegio: Privilegio
    avatar: str
    horta_id: Optional[int] = None
    ativo: bool

    nascimento_ano: Optional[int] = None
    sexo: Optional[Sexo] = None
    raca_cor: Optional[RacaCor] = None
    grupo_familiar: Optional[int] = None

    @computed_field
    @property
    def idade(self) -> Optional[int]:
        return date.today().year - self.nascimento_ano if self.nascimento_ano else None

    model_config = ConfigDict(from_attributes=True)
