from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape

from app.database.session import get_db
from app.database.models import ZonaRisco, Horta, Usuario
from app.schemas.zona_risco import (
    ZonaRiscoCreate, ZonaRiscoPublica,
    ZonaRiscoFeature, ZonaRiscoFeatureCollection,
    PoligonoGeografico, PropriedadesZonaRisco,
    TipoZona, NivelRisco,
)
from app.api.dependencies import get_admin_user

router = APIRouter(tags=["Zonas de Risco"])

DBDep = Annotated[Session, Depends(get_db)]


def _to_publica(z: ZonaRisco) -> ZonaRiscoPublica:
    coords = None
    if z.area is not None:
        shape = to_shape(z.area)
        coords = [[lng, lat] for lng, lat in shape.exterior.coords]
    return ZonaRiscoPublica(
        id=z.id,
        nome=z.nome,
        tipo=z.tipo,
        nivel=z.nivel,
        descricao=z.descricao,
        coordinates=coords,
    )


def _wkt_poligono(coords: list[list[float]]) -> str:
    # Fecha o anel se o último ponto for diferente do primeiro
    if coords[0] != coords[-1]:
        coords = coords + [coords[0]]
    pontos = ", ".join(f"{lng} {lat}" for lng, lat in coords)
    return f"SRID=4326;POLYGON(({pontos}))"


@router.get("/zonas-risco", response_model=list[ZonaRiscoPublica])
def read_zonas(db: DBDep):
    return [_to_publica(z) for z in db.query(ZonaRisco).all()]


@router.get("/zonas-risco/{id}", response_model=ZonaRiscoPublica)
def read_zona(id: int, db: DBDep):
    zona = db.query(ZonaRisco).filter(ZonaRisco.id == id).first()
    if not zona:
        raise HTTPException(404, "Zona de risco não encontrada")
    return _to_publica(zona)


@router.post("/zonas-risco", response_model=ZonaRiscoPublica)
def create_zona(
    zona: ZonaRiscoCreate,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)],
):
    data = zona.model_dump()
    coords = data.pop("coordinates")
    data["area"] = _wkt_poligono(coords)

    db_zona = ZonaRisco(**data)
    db.add(db_zona)
    db.commit()
    db.refresh(db_zona)
    return _to_publica(db_zona)


@router.delete("/zonas-risco/{id}")
def delete_zona(
    id: int,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)],
):
    zona = db.query(ZonaRisco).filter(ZonaRisco.id == id).first()
    if not zona:
        raise HTTPException(404, "Zona de risco não encontrada")
    db.delete(zona)
    db.commit()
    return {"detail": "Zona de risco removida com sucesso"}


@router.get("/mapa/riscos", response_model=ZonaRiscoFeatureCollection)
def mapa_riscos(db: DBDep):
    zonas = db.query(ZonaRisco).all()
    features = []
    for z in zonas:
        shape = to_shape(z.area)
        coords = [[lng, lat] for lng, lat in shape.exterior.coords]
        features.append(
            ZonaRiscoFeature(
                geometry=PoligonoGeografico(coordinates=[coords]),
                properties=PropriedadesZonaRisco(
                    id=z.id,
                    nome=z.nome,
                    tipo=z.tipo,
                    nivel=z.nivel,
                    descricao=z.descricao,
                ),
            )
        )
    return ZonaRiscoFeatureCollection(features=features)


@router.get("/hortas/{id}/riscos", response_model=list[ZonaRiscoPublica])
def riscos_da_horta(id: int, db: DBDep):
    horta = db.query(Horta).filter(Horta.id == id).first()
    if not horta:
        raise HTTPException(404, "Horta não encontrada")
    if horta.localizacao is None:
        return []

    zonas = db.query(ZonaRisco).filter(
        ZonaRisco.area.ST_Contains(horta.localizacao)
    ).all()

    return [_to_publica(z) for z in zonas]
