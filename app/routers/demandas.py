from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import hoje
from app.core.http import aplica_etag
from app.database.session import get_db
from app.database.enums import StatusPedido
from app.database.models import Canteiro, Demanda, Usuario
from app.schemas.demanda import (
    DemandaCreate, DemandaRead, DemandaUpdateEncaminhamento, PedidoUpdateStatus,
)
from app.dependencies import get_current_user, get_lider_user
from app.permissions import (
    exigir_acesso_horta, exigir_dono_do_canteiro, exigir_lider_da_horta, horta_id_visivel,
)
from app.core.idempotency import IdempotencyKeyHeader, commit_idempotente

router = APIRouter(tags=["Demandas"])

DBDep = Annotated[Session, Depends(get_db)]

_STATUS_FINAIS = (StatusPedido.ATENDIDA.value, StatusPedido.CANCELADA.value)
_EM_ABERTO = (StatusPedido.ABERTA.value, StatusPedido.EM_ATENDIMENTO.value)

LIMITE_HISTORICO = 20

# Lista muda a cada resposta do líder, então nada de max-age: o ETag devolve 304
# quando não mudou, e o aparelho nunca mostra um pedido já respondido.
_CACHE_LISTA = "private, no-cache"


def aplicar_encaminhamento(pedido, encaminhada: bool):
    """Regra de subir um pedido à administração, compartilhada com as solicitações
    de plantio. Encaminhar de novo não reescreve a data da primeira vez."""
    if pedido.status in _STATUS_FINAIS:
        raise HTTPException(400, "Este pedido já foi encerrado.")

    if not encaminhada:
        pedido.encaminhada_em = None
    elif pedido.encaminhada_em is None:
        pedido.encaminhada_em = datetime.now(timezone.utc)


def aplicar_status(pedido, update: PedidoUpdateStatus):
    pedido.status = update.status
    if "previsao_entrega" in update.model_fields_set:
        pedido.previsao_entrega = update.previsao_entrega


DIAS_SEM_RESPOSTA = 2


def atraso_do_pedido(pedido) -> str | None:
    """Por que o pedido está atrasado, ou None. O líder tem DIAS_SEM_RESPOSTA para
    aprovar ou recusar; depois de aprovado, vale a previsão de entrega."""
    if pedido.status == StatusPedido.ABERTA.value:
        limite = datetime.now(timezone.utc) - timedelta(days=DIAS_SEM_RESPOSTA)
        return "SEM_RESPOSTA" if pedido.criado_em <= limite else None
    if pedido.status == StatusPedido.EM_ATENDIMENTO.value and pedido.previsao_entrega is not None:
        return "PREVISAO_VENCIDA" if pedido.previsao_entrega < hoje() else None
    return None


def abertos_e_historico(query, status, ordem, limite: int = LIMITE_HISTORICO):
    """Tudo que está em aberto, mais os últimos encerrados.

    Sem o corte a lista cresce para sempre: um ano de uso já são milhares de
    linhas que o celular baixa, converte em objeto e desenha na tela toda vez.
    """
    abertos = query.filter(status.in_(_EM_ABERTO)).order_by(ordem.desc()).all()
    encerrados = (
        query.filter(status.notin_(_EM_ABERTO))
        .order_by(ordem.desc())
        .limit(limite)
        .all()
    )
    return abertos + encerrados


@router.get("/demandas", response_model=list[DemandaRead])
def read_demandas(
    request: Request,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    horta_id = horta_id_visivel(lider)
    query = db.query(Demanda)
    if horta_id is not None:
        query = query.filter(Demanda.horta_id == horta_id)

    payload = [
        DemandaRead.model_validate(d)
        for d in abertos_e_historico(query, Demanda.status, Demanda.id)
    ]
    return aplica_etag(request, payload, cache_control=_CACHE_LISTA)


@router.get("/canteiros/{canteiro_id}/demandas", response_model=list[DemandaRead])
def read_demandas_do_canteiro(
    canteiro_id: int,
    request: Request,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)],
):
    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()
    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(usuario, canteiro.horta_id)
    exigir_dono_do_canteiro(usuario, canteiro)

    query = db.query(Demanda).filter(Demanda.canteiro_id == canteiro_id)
    payload = [
        DemandaRead.model_validate(d)
        for d in abertos_e_historico(query, Demanda.status, Demanda.id)
    ]
    return aplica_etag(request, payload, cache_control=_CACHE_LISTA)


@router.post("/canteiros/{canteiro_id}/demandas", response_model=DemandaRead, status_code=201)
def create_demanda_membro(
    canteiro_id: int,
    demanda: DemandaCreate,
    db: DBDep,
    response: Response,
    usuario: Annotated[Usuario, Depends(get_current_user)],
    idempotency_key: IdempotencyKeyHeader = None,
):
    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()
    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(usuario, canteiro.horta_id)
    exigir_dono_do_canteiro(usuario, canteiro)

    db_demanda = Demanda(
        **demanda.model_dump(),
        horta_id=canteiro.horta_id,
        canteiro_id=canteiro_id,
        status="ABERTA",
    )
    db_demanda = commit_idempotente(db, db_demanda, idempotency_key, horta_id=canteiro.horta_id)
    response.headers["Location"] = f"/demandas/{db_demanda.id}"
    return db_demanda


@router.delete("/canteiros/{canteiro_id}/demandas/{id}", status_code=204)
def delete_demanda_membro(
    canteiro_id: int,
    id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)],
):
    db_demanda = db.query(Demanda).filter(
        Demanda.id == id,
        Demanda.canteiro_id == canteiro_id,
    ).first()

    if not db_demanda:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()
    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(usuario, canteiro.horta_id)
    exigir_dono_do_canteiro(usuario, canteiro)

    db.delete(db_demanda)
    db.commit()

@router.post("/hortas/{horta_id}/demandas", response_model=DemandaRead, status_code=201)
def create_demanda(
    horta_id: int,
    demanda: DemandaCreate,
    db: DBDep,
    response: Response,
    lider: Annotated[Usuario, Depends(get_lider_user)],
    idempotency_key: IdempotencyKeyHeader = None,
):
    exigir_lider_da_horta(lider, horta_id)

    db_demanda = Demanda(**demanda.model_dump(), horta_id=horta_id, status="ABERTA")
    db_demanda = commit_idempotente(db, db_demanda, idempotency_key, horta_id=horta_id)
    response.headers["Location"] = f"/demandas/{db_demanda.id}"
    return db_demanda

@router.patch("/hortas/{horta_id}/demandas/{demanda_id}/status", response_model=DemandaRead)
def update_demanda_status(
    horta_id: int,
    demanda_id: int,
    update_data: PedidoUpdateStatus,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    exigir_lider_da_horta(lider, horta_id)
    db_demanda = db.query(Demanda).filter(
        Demanda.id == demanda_id,
        Demanda.horta_id == horta_id,
    ).first()

    if not db_demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada nesta horta.")

    aplicar_status(db_demanda, update_data)
    db.commit()
    return db_demanda

@router.patch(
    "/hortas/{horta_id}/demandas/{demanda_id}/encaminhamento",
    response_model=DemandaRead,
)
def encaminhar_demanda(
    horta_id: int,
    demanda_id: int,
    update_data: DemandaUpdateEncaminhamento,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)],
):
    exigir_lider_da_horta(lider, horta_id)
    db_demanda = db.query(Demanda).filter(
        Demanda.id == demanda_id,
        Demanda.horta_id == horta_id,
    ).first()

    if not db_demanda:
        raise HTTPException(404, "Demanda não encontrada nesta horta.")

    if db_demanda.canteiro_id is None:
        raise HTTPException(400, "Este pedido já é da horta e a administração já o vê.")

    aplicar_encaminhamento(db_demanda, update_data.encaminhada)
    db.commit()
    return db_demanda


@router.delete("/demandas/{id}", status_code=204)
def delete_demanda(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_demanda = db.query(Demanda).filter(Demanda.id == id).first()

    if not db_demanda:
        raise HTTPException(404, "Demanda não encontrada")

    exigir_lider_da_horta(lider, db_demanda.horta_id)

    db.delete(db_demanda)
    db.commit()
