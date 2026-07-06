import json
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from geoalchemy2 import Geometry

from app.database.session import get_db
from app.database.models import ZonaRisco, Horta, Usuario
from app.schemas.zona_risco import (
    ZonaRiscoCreate, ZonaRiscoPublica, ZonaRiscoStatusUpdate,
    ZonaRiscoFeature, ZonaRiscoFeatureCollection,
    PoligonoGeografico, PropriedadesZonaRisco,
    TipoZona, NivelRisco,
)
from app.dependencies import get_admin_user
from app.core.http import aplica_etag

router = APIRouter(tags=["Zonas de Risco"])

DBDep = Annotated[Session, Depends(get_db)]


# Tolerância de simplificação em graus — ~5 m no equador, invisível em mapa urbano.
# Reduz vértices de polígonos de risco (que muitas vezes têm centenas de pontos finos).
# Doc: postgis.net/docs/ST_SimplifyPreserveTopology.html
_SIMPLIFICACAO_GRAUS = 0.00005


def _geom_simplificada():
    """ST_SimplifyPreserveTopology + ST_AsGeoJSON server-side (5 casas decimais ~1,1m).

    ST_SimplifyPreserveTopology é geometry-only — o cast geography→geometry em
    SRID 4326 não tem custo (mesma representação interna).
    """
    return func.ST_AsGeoJSON(
        func.ST_SimplifyPreserveTopology(
            ZonaRisco.area.cast(Geometry), _SIMPLIFICACAO_GRAUS
        ),
        5,
    ).label("geom")


def _zona_publica_cols():
    """Colunas + geometria simplificada compartilhadas pelas rotas de leitura."""
    return (
        ZonaRisco.id, ZonaRisco.nome, ZonaRisco.tipo, ZonaRisco.nivel,
        ZonaRisco.descricao, ZonaRisco.ativa,
        ZonaRisco.data_ocorrencia, ZonaRisco.data_fim,
        _geom_simplificada(),
    )


def _to_publica_row(row) -> ZonaRiscoPublica:
    geometry = None
    if row.geom is not None:
        poligono = json.loads(row.geom)
        geometry = PoligonoGeografico(coordinates=poligono["coordinates"])
    return ZonaRiscoPublica(
        id=row.id,
        nome=row.nome,
        tipo=row.tipo,
        nivel=row.nivel,
        descricao=row.descricao,
        geometry=geometry,
        ativa=row.ativa,
        data_ocorrencia=row.data_ocorrencia,
        data_fim=row.data_fim,
    )


def _zona_para_feature(z) -> ZonaRiscoFeature:
    poligono = json.loads(z.geom)
    return ZonaRiscoFeature(
        geometry=PoligonoGeografico(coordinates=poligono["coordinates"]),
        properties=PropriedadesZonaRisco(
            id=z.id,
            nome=z.nome,
            tipo=z.tipo,
            nivel=z.nivel,
            descricao=z.descricao,
            ativa=z.ativa,
            data_ocorrencia=z.data_ocorrencia,
            data_fim=z.data_fim,
        ),
    )


def _wkt_poligono(coords: list[list[float]]) -> str:
    # Fecha o anel se o último ponto for diferente do primeiro
    if coords[0] != coords[-1]:
        coords = coords + [coords[0]]
    pontos = ", ".join(f"{lng} {lat}" for lng, lat in coords)
    return f"SRID=4326;POLYGON(({pontos}))"


@router.get("/zonas-risco", response_model=list[ZonaRiscoPublica])
def read_zonas(db: DBDep):
    rows = db.query(*_zona_publica_cols()).all()
    return [_to_publica_row(r) for r in rows]


@router.get("/zonas-risco/{id}", response_model=ZonaRiscoPublica)
def read_zona(id: int, db: DBDep):
    row = db.query(*_zona_publica_cols()).filter(ZonaRisco.id == id).first()
    if not row:
        raise HTTPException(404, "Zona de risco não encontrada")
    return _to_publica_row(row)


@router.post("/zonas-risco", response_model=ZonaRiscoPublica, status_code=201)
def create_zona(
    zona: ZonaRiscoCreate,
    db: DBDep,
    response: Response,
    admin: Annotated[Usuario, Depends(get_admin_user)],
):
    data = zona.model_dump()
    coords = data.pop("coordinates")
    data["area"] = _wkt_poligono(coords)

    db_zona = ZonaRisco(**data)
    db.add(db_zona)
    db.commit()
    response.headers["Location"] = f"/zonas-risco/{db_zona.id}"
    # Re-busca com a geometria simplificada para devolver formato consistente com GETs
    row = db.query(*_zona_publica_cols()).filter(ZonaRisco.id == db_zona.id).first()
    return _to_publica_row(row)


@router.delete("/zonas-risco/{id}", status_code=204)
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


@router.patch("/zonas-risco/{id}/status", response_model=ZonaRiscoPublica)
def atualizar_status_zona(
    id: int,
    body: ZonaRiscoStatusUpdate,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)],
):
    zona = db.query(ZonaRisco).filter(ZonaRisco.id == id).first()
    if not zona:
        raise HTTPException(404, "Zona de risco não encontrada")

    zona.ativa = body.ativa
    zona.data_ocorrencia = body.data_ocorrencia
    zona.data_fim = body.data_fim

    db.commit()
    row = db.query(*_zona_publica_cols()).filter(ZonaRisco.id == id).first()
    return _to_publica_row(row)


@router.get("/alertas/ativos", response_model=ZonaRiscoFeatureCollection)
def alertas_ativos(request: Request, db: DBDep):
    zonas = (
        db.query(*_zona_publica_cols())
        .filter(ZonaRisco.ativa == True)
        .all()
    )
    # Alertas ativos mudam mais (ativa pode virar false): TTL curto + stale curto
    return aplica_etag(
        request,
        ZonaRiscoFeatureCollection(features=[_zona_para_feature(z) for z in zonas]),
        cache_control="public, max-age=60, stale-while-revalidate=300",
    )


@router.get("/mapa/riscos", response_model=ZonaRiscoFeatureCollection)
def mapa_riscos(request: Request, db: DBDep):
    zonas = db.query(*_zona_publica_cols()).all()
    # Catálogo de zonas (ativas + inativas) raramente é alterado
    return aplica_etag(
        request,
        ZonaRiscoFeatureCollection(features=[_zona_para_feature(z) for z in zonas]),
        cache_control="public, max-age=300, stale-while-revalidate=3600",
    )


@router.get("/hortas/{id}/riscos", response_model=list[ZonaRiscoPublica])
def riscos_da_horta(id: int, db: DBDep):
    horta = db.query(Horta).filter(Horta.id == id).first()
    if not horta:
        raise HTTPException(404, "Horta não encontrada")
    if horta.localizacao is None:
        return []

    # ST_Covers em vez de ST_Contains: sem boundary quirk, e a sobrecarga
    # geography(polygon, point) opera direto sem cast.
    # Doc: postgis.net/docs/ST_Covers.html
    rows = db.query(*_zona_publica_cols()).filter(
        ZonaRisco.ativa == True,
        ZonaRisco.area.ST_Covers(horta.localizacao),
    ).all()

    return [_to_publica_row(r) for r in rows]
