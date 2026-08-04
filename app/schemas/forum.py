from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.database.enums import TipoPost

ContentTypeImagem = Literal["image/jpeg", "image/png", "image/webp"]

MAX_CONTEUDO = 2000
MAX_MOTIVO = 280


def _exigir_texto(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Não pode ficar vazio.")
    return v


class PostCreate(BaseModel):
    # Opcional: um post pode ter só foto, sem texto.
    conteudo: str = Field(default="", max_length=MAX_CONTEUDO)
    tipo: TipoPost = TipoPost.AJUDA

    @field_validator("conteudo")
    @classmethod
    def limpar(cls, v: str) -> str:
        return v.strip()


class RespostaCreate(BaseModel):
    conteudo: str = Field(min_length=1, max_length=MAX_CONTEUDO)

    @field_validator("conteudo")
    @classmethod
    def limpar(cls, v: str) -> str:
        return _exigir_texto(v)


class DenunciaCreate(BaseModel):
    motivo: Optional[str] = Field(default=None, max_length=MAX_MOTIVO)

    @field_validator("motivo")
    @classmethod
    def limpar(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class PresignRequest(BaseModel):
    content_type: ContentTypeImagem


class PresignResponse(BaseModel):
    upload_url: str
    key: str


class ConfirmRequest(BaseModel):
    key: str = Field(min_length=1, max_length=500)


class PostImagemRead(BaseModel):
    id: int
    image_url: str
    content_type: str


class AutorRead(BaseModel):
    id: int
    nome: str
    avatar: str
    horta: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RespostaRead(BaseModel):
    id: int
    post_id: int
    autor: Optional[AutorRead] = None
    conteudo: str
    criado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class PostRead(BaseModel):
    id: int
    autor: Optional[AutorRead] = None
    tipo: TipoPost
    conteudo: str
    imagens: list[PostImagemRead] = []
    criado_em: datetime
    respostas_count: int = 0
    likes_count: int = 0
    eu_curti: bool = False

    model_config = ConfigDict(from_attributes=True)


class PostDetalhe(BaseModel):
    id: int
    autor: Optional[AutorRead] = None
    tipo: TipoPost
    conteudo: str
    imagens: list[PostImagemRead] = []
    criado_em: datetime
    respostas: list[RespostaRead] = []
    likes_count: int = 0
    eu_curti: bool = False

    model_config = ConfigDict(from_attributes=True)


class FeedRead(BaseModel):
    items: list[PostRead]
    proximo_cursor: Optional[int] = None


class LikeRead(BaseModel):
    likes_count: int
    eu_curti: bool


class DenunciaRead(BaseModel):
    """Fila de moderação. `trecho` é o começo do texto denunciado — o bastante
    para decidir na lista sem carregar o post inteiro."""
    id: int
    post_id: Optional[int] = None
    resposta_id: Optional[int] = None
    trecho: str
    autor: Optional[AutorRead] = None
    motivo: Optional[str] = None
    criado_em: datetime
