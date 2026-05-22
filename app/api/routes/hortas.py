from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, cast
from sqlalchemy.orm import Session
from geoalchemy2 import Geography, Geometry
from geoalchemy2.shape import to_shape

from app.database.session import get_db
from app.database.models import Horta, ZonaRisco, Usuario
from app.schemas.horta import (
    HortaCreate, HortaPublica,
    HortaFeature, HortaFeatureCollection,
    HortaCompletaFeature, HortaCompletaFeatureCollection,
    PontoGeografico, PropriedadesHorta, PropriedadesHortaCompleta,
    ZonaRiscoResumida, SituacaoHorta,
)
from app.api.dependencies import get_admin_user, get_current_user


def _proximas_query(db, ids: list[int], raio_metros: float):
    return (
        db.query(Horta, ZonaRisco)
        .join(ZonaRisco, func.ST_DWithin(
            Horta.localizacao,               # Geography nativo — índice GiST usado diretamente
            cast(ZonaRisco.area, Geography), # Geometry → Geography para distância em metros
            raio_metros,
        ))
        .filter(Horta.id.in_(ids))
        .all()
    )

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
        tem_cisterna=h.tem_cisterna,
        fonte_agua=h.fonte_agua,
        tipo_solo=h.tipo_solo,
        area_permeavel=h.area_permeavel,
        nivel_vulnerabilidade=h.nivel_vulnerabilidade,
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
                    tem_cisterna=h.tem_cisterna,
                    fonte_agua=h.fonte_agua,
                    tipo_solo=h.tipo_solo,
                    area_permeavel=h.area_permeavel,
                    nivel_vulnerabilidade=h.nivel_vulnerabilidade,
                ),
            )
        )

    return HortaFeatureCollection(features=features)


@router.get("/mapa/completo", response_model=HortaCompletaFeatureCollection)
def mapa_completo(
    db: DBDep,
    raio_alerta_km: Annotated[float, Query(gt=0)] = 1.0,
    raio_monitoramento_km: Annotated[float, Query(gt=0)] = 4.0,
):
    if raio_monitoramento_km <= raio_alerta_km:
        raise HTTPException(422, "raio_monitoramento_km deve ser maior que raio_alerta_km")

    # Query 1 — ST_Within: hortas DENTRO de uma zona (LEFT JOIN)
    # ST_Within é Geometry-only: cast Geography → Geometry para este predicado
    dentro_results = (
        db.query(Horta, ZonaRisco)
        .outerjoin(ZonaRisco, cast(Horta.localizacao, Geometry).ST_Within(ZonaRisco.area))
        .filter(Horta.localizacao.isnot(None))
        .all()
    )

    situacao_map: dict[int, tuple] = {}
    for horta, zona in dentro_results:
        if horta.id not in situacao_map:
            situacao = SituacaoHorta.DENTRO if zona else SituacaoHorta.SEGURA
            situacao_map[horta.id] = (horta, zona, situacao)

    def ids_com_situacao(sit: SituacaoHorta) -> list[int]:
        return [hid for hid, (_, _, s) in situacao_map.items() if s == sit]

    # Query 2 — até raio_alerta_km (padrão 1km) → ALERTA
    ids_seguras = ids_com_situacao(SituacaoHorta.SEGURA)
    if ids_seguras:
        for horta, zona in _proximas_query(db, ids_seguras, raio_alerta_km * 1000):
            if situacao_map[horta.id][2] == SituacaoHorta.SEGURA:
                situacao_map[horta.id] = (horta, zona, SituacaoHorta.ALERTA)

    # Query 3 — até raio_monitoramento_km (padrão 5km) → MONITORAMENTO
    # Só verifica as que ainda são SEGURA após a query 2
    ids_seguras = ids_com_situacao(SituacaoHorta.SEGURA)
    if ids_seguras:
        for horta, zona in _proximas_query(db, ids_seguras, raio_monitoramento_km * 1000):
            if situacao_map[horta.id][2] == SituacaoHorta.SEGURA:
                situacao_map[horta.id] = (horta, zona, SituacaoHorta.MONITORAMENTO)

    features = []
    for horta, zona, situacao in situacao_map.values():
        ponto = to_shape(horta.localizacao)
        features.append(
            HortaCompletaFeature(
                geometry=PontoGeografico(coordinates=[ponto.x, ponto.y]),
                properties=PropriedadesHortaCompleta(
                    id=horta.id,
                    nome=horta.nome,
                    rua=horta.rua,
                    numero=horta.numero,
                    bairro=horta.bairro,
                    cidade=horta.cidade,
                    uf=horta.uf,
                    area_total=horta.area_total,
                    publico_atendido=horta.publico_atendido,
                    tem_cisterna=horta.tem_cisterna,
                    fonte_agua=horta.fonte_agua,
                    tipo_solo=horta.tipo_solo,
                    area_permeavel=horta.area_permeavel,
                    nivel_vulnerabilidade=horta.nivel_vulnerabilidade,
                    situacao=situacao,
                    zona_risco=ZonaRiscoResumida(
                        id=zona.id, tipo=zona.tipo, nivel=zona.nivel
                    ) if zona else None,
                ),
            )
        )

    return HortaCompletaFeatureCollection(features=features)


@router.get("/hortas/proximas", response_model=HortaFeatureCollection)
def hortas_proximas(
    lat: float,
    lng: float,
    raio_km: Annotated[float, Query(gt=0, le=100)],
    db: DBDep,
):
    raio_metros = raio_km * 1000
    ponto_usuario = f"SRID=4326;POINT({lng} {lat})"

    hortas = db.query(Horta).filter(
        func.ST_DWithin(
            Horta.localizacao,              # Geography nativo — índice GiST usado diretamente
            cast(ponto_usuario, Geography), # texto → Geography
            raio_metros,
        )
    ).all()

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
                    tem_cisterna=h.tem_cisterna,
                    fonte_agua=h.fonte_agua,
                    tipo_solo=h.tipo_solo,
                    area_permeavel=h.area_permeavel,
                    nivel_vulnerabilidade=h.nivel_vulnerabilidade,
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
