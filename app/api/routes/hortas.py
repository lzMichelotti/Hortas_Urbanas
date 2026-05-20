from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape

from app.database.session import get_db
from app.database.models import Horta, Usuario
from app.schemas.horta import (
    HortaCreate, HortaPublica,
    HortaFeature, HortaFeatureCollection,
    PontoGeografico, PropriedadesHorta,
)
from app.api.dependencies import get_admin_user, get_current_user

router = APIRouter(tags=["Hortas"])

DBDep = Annotated[Session, Depends(get_db)]


def _to_publica(h: Horta) -> HortaPublica:
    lat, lng = None, None
    if h.localizacao is not None:
        ponto = to_shape(h.localizacao)
        lng, lat = ponto.x, ponto.y
    return HortaPublica(
        id=h.id,
        nome=h.nome,
        rua=h.rua,
        numero=h.numero,
        bairro=h.bairro,
        cep=h.cep,
        cidade=h.cidade,
        uf=h.uf,
        latitude=lat,
        longitude=lng,
        area_total=h.area_total,
        publico_atendido=h.publico_atendido,
    )


def _wkt_ponto(lat: float, lng: float) -> str:
    return f"POINT({lng} {lat})"


@router.get("/hortas", response_model=list[HortaPublica])
def read_hortas(db: DBDep):
    return [_to_publica(h) for h in db.query(Horta).all()]


@router.get("/mapa", response_model=HortaFeatureCollection)
def mapa_hortas(db: DBDep):
    hortas = db.query(Horta).filter(Horta.localizacao.isnot(None)).all()

    features = []
    for h in hortas:
        ponto = to_shape(h.localizacao)
        features.append(
            HortaFeature(
                geometry=PontoGeografico(coordinates=[ponto.x, ponto.y]),
                properties=PropriedadesHorta(
                    id=h.id,
                    nome=h.nome,
                    rua=h.rua,
                    numero=h.numero,
                    bairro=h.bairro,
                    cidade=h.cidade,
                    uf=h.uf,
                    area_total=h.area_total,
                    publico_atendido=h.publico_atendido,
                ),
            )
        )

    return HortaFeatureCollection(features=features)


@router.get("/hortas/{id}", response_model=HortaPublica)
def read_horta_por_id(id: int, db: DBDep):
    db_horta = db.query(Horta).filter(Horta.id == id).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    return _to_publica(db_horta)


@router.put("/hortas/{id}")
def update_horta(
    id: int,
    horta: HortaCreate,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    db_horta = db.query(Horta).filter(Horta.id == id).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    data = horta.model_dump(exclude_unset=True)
    lat = data.pop("latitude", None)
    lng = data.pop("longitude", None)
    if lat is not None and lng is not None:
        data["localizacao"] = _wkt_ponto(lat, lng)

    for key, value in data.items():
        setattr(db_horta, key, value)

    db.commit()
    db.refresh(db_horta)
    return _to_publica(db_horta)


@router.post("/hortas")
def create_horta(
    horta: HortaCreate,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    data = horta.model_dump()
    lat = data.pop("latitude", None)
    lng = data.pop("longitude", None)
    if lat is not None and lng is not None:
        data["localizacao"] = _wkt_ponto(lat, lng)

    db_horta = Horta(**data)
    db.add(db_horta)
    db.commit()
    db.refresh(db_horta)
    return _to_publica(db_horta)


@router.delete("/hortas/{id}")
def delete_horta(
    id: int,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    db_horta = db.query(Horta).filter(Horta.id == id).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    db.delete(db_horta)
    db.commit()

    return {"detail": "Horta removida com sucesso"}
