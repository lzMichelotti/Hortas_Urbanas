from pydantic import BaseModel, ConfigDict


class CanteiroBase(BaseModel):
    identificacao: str
    area_produtiva: float
    area_ociosa: float


class CanteiroCreate(CanteiroBase):
    usuario_id: int | None = None


class CanteiroUpdate(BaseModel):
    usuario_id: int | None = None
    identificacao: str | None = None
    area_produtiva: float | None = None
    area_ociosa: float | None = None


class CanteiroRead(CanteiroBase):
    id: int
    horta_id: int
    usuario_id: int | None = None

    model_config = ConfigDict(from_attributes=True)
