import json
import logging
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import func, distinct, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape
import shapely.wkt

from app.database.session import get_db
from app.database.models import Horta, ZonaRisco, Usuario, Canteiro, CicloProducao
from app.schemas.horta import (
    HortaCreate, HortaUpdate, HortaPublica,
    HortaFeature, HortaFeatureCollection,
    HortaCompletaFeature, HortaCompletaFeatureCollection,
    PontoGeografico, PropriedadesHorta, PropriedadesHortaCompleta,
    ZonaRiscoResumida, SituacaoHorta,
    HortaRegistroCreate, HortaRegistroRead,
)
from app.api.dependencies import get_admin_user, get_current_user
from app.core.http import aplica_etag
from app.core.security import get_password_hash


def _indice_biodiversidade(db: Session, horta_id: int) -> int:
    return (
        db.query(func.count(distinct(CicloProducao.produto_id)))
        .join(Canteiro, CicloProducao.canteiro_id == Canteiro.id)
        .filter(
            Canteiro.horta_id == horta_id,
            Canteiro.ativo == True,
            CicloProducao.ativo == True,
            CicloProducao.status.notin_(["PERDIDO", "COLHIDO"]),
            CicloProducao.produto_id.isnot(None),
        )
        .scalar() or 0
    )


def _biodiversidade_em_lote(db: Session, horta_ids: list[int]) -> dict[int, int]:
    if not horta_ids:
        return {}
    rows = (
        db.query(Canteiro.horta_id, func.count(distinct(CicloProducao.produto_id)))
        .join(CicloProducao, CicloProducao.canteiro_id == Canteiro.id)
        .filter(
            Canteiro.horta_id.in_(horta_ids),
            Canteiro.ativo == True,
            CicloProducao.ativo == True,
            CicloProducao.status.notin_(["PERDIDO", "COLHIDO"]),
            CicloProducao.produto_id.isnot(None),
        )
        .group_by(Canteiro.horta_id)
        .all()
    )
    return {horta_id: count for horta_id, count in rows}


def _proximas_query(db, ids: list[int], raio_metros: float):
    return (
        db.query(Horta, ZonaRisco)
        .join(ZonaRisco, and_(
            # Ambas geography: GiST nas duas colunas usado direto, sem cast.
            # use_spheroid=false → cálculo esférico (sub-métrico de diferença
            # em raios urbanos) e mais rápido. Doc: postgis.net/docs/ST_DWithin.html
            func.ST_DWithin(
                Horta.localizacao,
                ZonaRisco.area,
                raio_metros,
                False,
            ),
            ZonaRisco.ativa == True,
        ))
        .filter(Horta.id.in_(ids))
        .all()
    )

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Hortas"])

DBDep = Annotated[Session, Depends(get_db)]

# Mapa de hortas muda raramente — fresh por 5min, stale-while-revalidate por 1h
_CACHE_MAPA = "public, max-age=300, stale-while-revalidate=3600"


def _to_publica(h: Horta, indice_biodiversidade: int) -> HortaPublica:
    lat, lng = None, None
    if h.localizacao is not None:
        loc = h.localizacao
        if isinstance(loc, str):
            # expire_on_commit=False mantém o WKT string após INSERT/UPDATE.
            # Handles "POINT(lng lat)" e "SRID=4326;POINT(lng lat)".
            ponto = shapely.wkt.loads(loc.split(";")[-1])
        else:
            ponto = to_shape(loc)
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
        praticas_cultivo=h.praticas_cultivo,
        indice_biodiversidade=indice_biodiversidade,
    )


def _wkt_ponto(lat: float, lng: float) -> str:
    return f"POINT({lng} {lat})"


@router.get("/hortas", response_model=list[HortaPublica])
def read_hortas(db: DBDep):
    hortas = db.query(Horta).filter(Horta.ativo == True).all()
    bio = _biodiversidade_em_lote(db, [h.id for h in hortas])
    return [_to_publica(h, bio.get(h.id, 0)) for h in hortas]


@router.get("/mapa", response_model=HortaFeatureCollection)
def mapa_hortas(request: Request, db: DBDep):
    # ST_AsGeoJSON com 5 casas decimais (~1,1 m de precisão — equivalente a
    # GPS comum) reduz payload em ~14% por coordenada vs. 6 casas.
    # Doc: postgis.net/docs/ST_AsGeoJSON.html (maxdecimaldigits)
    hortas = (
        db.query(
            Horta.id, Horta.nome, Horta.rua, Horta.numero, Horta.bairro,
            Horta.cidade, Horta.uf, Horta.area_total, Horta.publico_atendido,
            Horta.tem_cisterna, Horta.fonte_agua, Horta.tipo_solo,
            Horta.area_permeavel, Horta.nivel_vulnerabilidade, Horta.praticas_cultivo,
            func.ST_AsGeoJSON(Horta.localizacao, 5).label("geom"),
        )
        .filter(Horta.localizacao.isnot(None), Horta.ativo == True)
        .all()
    )
    bio = _biodiversidade_em_lote(db, [h.id for h in hortas])

    features = [
        HortaFeature(
            geometry=PontoGeografico(coordinates=json.loads(h.geom)["coordinates"]),
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
                praticas_cultivo=h.praticas_cultivo,
                indice_biodiversidade=bio.get(h.id, 0),
            ),
        )
        for h in hortas
    ]

    return aplica_etag(
        request,
        HortaFeatureCollection(features=features),
        cache_control=_CACHE_MAPA,
    )


@router.get("/mapa/completo", response_model=HortaCompletaFeatureCollection)
def mapa_completo(
    db: DBDep,
    raio_alerta_km: Annotated[float, Query(gt=0, le=100)] = 1.0,
    raio_monitoramento_km: Annotated[float, Query(gt=0, le=100)] = 4.0,
):
    if raio_monitoramento_km <= raio_alerta_km:
        raise HTTPException(422, "raio_monitoramento_km deve ser maior que raio_alerta_km")

    # Query 1 — ST_Covers: hortas DENTRO de uma zona ativa (LEFT JOIN).
    # and_() no ON garante que hortas SEGURAS continuam no resultado.
    # ST_Covers em vez de ST_Within: doc oficial recomenda — não tem o quirk
    # de fronteira ("lines and points lying fully in the boundary of polygons
    # are not within the geometry"). postgis.net/docs/ST_Covers.html
    # Overload geography (polygon, point) usado diretamente, sem cast.
    dentro_results = (
        db.query(Horta, ZonaRisco)
        .outerjoin(ZonaRisco, and_(
            ZonaRisco.area.ST_Covers(Horta.localizacao),
            ZonaRisco.ativa == True,
        ))
        .filter(Horta.localizacao.isnot(None), Horta.ativo == True)
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

    bio = _biodiversidade_em_lote(db, list(situacao_map.keys()))

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
                    praticas_cultivo=horta.praticas_cultivo,
                    indice_biodiversidade=bio.get(horta.id, 0),
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
    # Texto WKT com SRID embutido — GeoAlchemy2 reconhece e GiST é usado.
    ponto_usuario = f"SRID=4326;POINT({lng} {lat})"

    hortas = db.query(Horta).filter(
        func.ST_DWithin(
            Horta.localizacao,
            ponto_usuario,
            raio_metros,
            False,  # use_spheroid=False: ~m de diferença em raios urbanos, mais rápido
        ),
        Horta.ativo == True,
    ).all()

    bio = _biodiversidade_em_lote(db, [h.id for h in hortas])

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
                    praticas_cultivo=h.praticas_cultivo,
                    indice_biodiversidade=bio.get(h.id, 0),
                ),
            )
        )

    return HortaFeatureCollection(features=features)


@router.get("/hortas/{id}", response_model=HortaPublica)
def read_horta_por_id(id: int, db: DBDep):
    db_horta = db.query(Horta).filter(Horta.id == id, Horta.ativo == True).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    return _to_publica(db_horta, _indice_biodiversidade(db, db_horta.id))


@router.patch("/hortas/{id}", response_model=HortaPublica)
def update_horta(
    id: int,
    horta: HortaUpdate,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    db_horta = db.query(Horta).filter(Horta.id == id, Horta.ativo == True).first()

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
    return _to_publica(db_horta, _indice_biodiversidade(db, db_horta.id))


@router.post("/hortas/registro", response_model=HortaRegistroRead, status_code=201)
def registrar_horta_com_lider(
    payload: HortaRegistroCreate,
    db: DBDep,
    response: Response,
    admin: Annotated[Usuario, Depends(get_admin_user)],
):
    """Cria Horta + Usuario líder numa única transação: ou tudo, ou nada."""
    data = payload.horta.model_dump()
    lat = data.pop("latitude", None)
    lng = data.pop("longitude", None)
    if lat is not None and lng is not None:
        data["localizacao"] = _wkt_ponto(lat, lng)

    db_horta = Horta(**data)
    db.add(db_horta)
    db.flush()  # popula db_horta.id sem commitar — transação segue aberta

    senha_hash = get_password_hash(payload.lider.cpf)  # credencial é email+CPF; senha = CPF
    db_lider = Usuario(
        **payload.lider.model_dump(),
        privilegio="LIDER_HORTA",
        horta_id=db_horta.id,
        senha_hash=senha_hash,
    )
    db.add(db_lider)

    try:
        db.commit()  # único commit cobre horta + líder atomicamente
    except IntegrityError as e:
        db.rollback()  # descarta a horta também — sem órfã
        constraint = (getattr(getattr(e.orig, "diag", None), "constraint_name", "") or "").lower()
        if "cpf" in constraint:
            raise HTTPException(409, "Este CPF já está cadastrado.")
        if "email" in constraint:
            raise HTTPException(409, "Este Email já está cadastrado.")
        raise  # outras violações caem no handler global em app/main.py

    response.headers["Location"] = f"/hortas/{db_horta.id}"
    logger.info(
        "Horta criada via registro: horta_id=%d nome='%s' lider_id=%d por admin id=%d",
        db_horta.id, db_horta.nome, db_lider.id, admin.id,
    )
    return HortaRegistroRead(
        horta=_to_publica(db_horta, _indice_biodiversidade(db, db_horta.id)),
        lider=db_lider,
    )


@router.post("/hortas", response_model=HortaPublica, status_code=201)
def create_horta(
    horta: HortaCreate,
    db: DBDep,
    response: Response,
    admin: Annotated[Usuario, Depends(get_admin_user)],
):
    data = horta.model_dump()
    lat = data.pop("latitude", None)
    lng = data.pop("longitude", None)
    if lat is not None and lng is not None:
        data["localizacao"] = _wkt_ponto(lat, lng)

    db_horta = Horta(**data)
    db.add(db_horta)
    db.commit()
    response.headers["Location"] = f"/hortas/{db_horta.id}"
    logger.info("Horta criada: id=%d nome='%s' por admin id=%d", db_horta.id, db_horta.nome, admin.id)
    return _to_publica(db_horta, _indice_biodiversidade(db, db_horta.id))


@router.delete("/hortas/{id}", status_code=204)
def delete_horta(
    id: int,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    db_horta = db.query(Horta).filter(Horta.id == id, Horta.ativo == True).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    db_horta.ativo = False
    db_horta.deletado_em = datetime.now(timezone.utc)
    db.commit()
    logger.info("Horta removida (soft-delete): id=%d nome='%s' por admin id=%d", id, db_horta.nome, admin.id)
