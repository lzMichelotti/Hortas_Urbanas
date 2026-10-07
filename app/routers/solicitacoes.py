from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Canteiro, Produto, SolicitacaoPlantio, Usuario
from app.schemas.solicitacao import (
    SolicitacaoCreate, SolicitacaoRead, SolicitacaoUpdateEncaminhamento,
)
from app.schemas.demanda import PedidoUpdateStatus
from app.dependencies import get_current_user, get_lider_user
from app.permissions import exigir_acesso_horta, exigir_dono_do_canteiro, exigir_lider_da_horta
from app.core.http import aplica_etag
from app.core.idempotency import IdempotencyKeyHeader, commit_idempotente
from app.routers.demandas import abertos_e_historico, aplicar_encaminhamento, aplicar_status

router = APIRouter(tags=["Solicitações de Plantio"])

DBDep = Annotated[Session, Depends(get_db)]


_CACHE_LISTA = "private, no-cache"


def _pagina(request: Request, query):
    payload = [
        SolicitacaoRead.model_validate(s)
        for s in abertos_e_historico(query, SolicitacaoPlantio.status, SolicitacaoPlantio.id)
    ]
    return aplica_etag(request, payload, cache_control=_CACHE_LISTA)


@router.get("/solicitacoes", response_model=list[SolicitacaoRead])
def read_solicitacoes(
    request: Request,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    query = db.query(SolicitacaoPlantio)
    if lider.privilegio == "LIDER_HORTA":
        query = query.join(Canteiro).filter(
            Canteiro.horta_id == lider.horta_id, Canteiro.ativo == True
        )
    return _pagina(request, query)


@router.get("/canteiros/{canteiro_id}/solicitacoes", response_model=list[SolicitacaoRead])
def read_solicitacoes_do_canteiro(
    canteiro_id: int,
    request: Request,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()

    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(usuario, canteiro.horta_id)

    return _pagina(
        request,
        db.query(SolicitacaoPlantio).filter(SolicitacaoPlantio.canteiro_id == canteiro_id),
    )


@router.post("/canteiros/{canteiro_id}/solicitacoes", response_model=SolicitacaoRead, status_code=201)
def create_solicitacao(
    canteiro_id: int,
    solicitacao: SolicitacaoCreate,
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

    produto = db.query(Produto).filter(Produto.id == solicitacao.produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="O produto selecionado não existe no catálogo oficial.")

    db_solicitacao = SolicitacaoPlantio(**solicitacao.model_dump(), canteiro_id=canteiro_id)
    db_solicitacao = commit_idempotente(db, db_solicitacao, idempotency_key, canteiro_id=canteiro_id)
    response.headers["Location"] = f"/solicitacoes/{db_solicitacao.id}"
    return db_solicitacao


@router.patch("/solicitacoes/{id}/encaminhamento", response_model=SolicitacaoRead)
def encaminhar_solicitacao(
    id: int,
    update_data: SolicitacaoUpdateEncaminhamento,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)],
):
    db_solicitacao = db.query(SolicitacaoPlantio).filter(SolicitacaoPlantio.id == id).first()

    if not db_solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_solicitacao.canteiro_id).first()

    if not canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    exigir_lider_da_horta(lider, canteiro.horta_id)

    aplicar_encaminhamento(db_solicitacao, update_data.encaminhada)
    db.commit()
    return db_solicitacao


@router.patch("/solicitacoes/{id}/status", response_model=SolicitacaoRead)
def update_solicitacao_status(
    id: int,
    update_data: PedidoUpdateStatus,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_solicitacao = db.query(SolicitacaoPlantio).filter(SolicitacaoPlantio.id == id).first()

    if not db_solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_solicitacao.canteiro_id).first()

    if not canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    exigir_lider_da_horta(lider, canteiro.horta_id)

    aplicar_status(db_solicitacao, update_data)
    db.commit()
    return db_solicitacao


# Hard delete intencional: solicitação é um "ticket" de vida curta (PENDENTE →
# APROVADA/REJEITADA). Diferente de Horta/Canteiro/Ciclo (entidades de vida
# longa, com soft delete para histórico), descartar fisicamente um ticket
# rejeitado/cancelado não perde informação relevante.
@router.delete("/solicitacoes/{id}", status_code=204)
def delete_solicitacao(
    id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    db_solicitacao = db.query(SolicitacaoPlantio).filter(SolicitacaoPlantio.id == id).first()

    if not db_solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_solicitacao.canteiro_id).first()

    if not canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    exigir_acesso_horta(usuario, canteiro.horta_id)
    exigir_dono_do_canteiro(usuario, canteiro)

    db.delete(db_solicitacao)
    db.commit()
