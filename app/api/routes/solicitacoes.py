from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Canteiro, Produto, SolicitacaoPlantio, Usuario
from app.schemas.solicitacao import SolicitacaoCreate, SolicitacaoRead, SolicitacaoUpdateStatus
from app.api.dependencies import get_current_user, get_lider_user
from app.api.permissions import exigir_acesso_horta, exigir_dono_do_canteiro, exigir_lider_da_horta

router = APIRouter(tags=["Solicitações de Plantio"])

DBDep = Annotated[Session, Depends(get_db)]


@router.get("/solicitacoes", response_model=list[SolicitacaoRead])
def read_solicitacoes(
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    if lider.privilegio == "LIDER_HORTA":
        return db.query(SolicitacaoPlantio).join(Canteiro).filter(Canteiro.horta_id == lider.horta_id).all()
    return db.query(SolicitacaoPlantio).all()

    

@router.get("/canteiros/{canteiro_id}/solicitacoes", response_model=list[SolicitacaoRead])
def read_solicitacoes_do_canteiro(
    canteiro_id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()

    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(usuario, canteiro.horta_id)

    return db.query(SolicitacaoPlantio).filter(SolicitacaoPlantio.canteiro_id == canteiro_id).all()


@router.post("/canteiros/{canteiro_id}/solicitacoes", response_model=SolicitacaoRead)
def create_solicitacao(
    canteiro_id: int,
    solicitacao: SolicitacaoCreate,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
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
    db.add(db_solicitacao)
    db.commit()
    db.refresh(db_solicitacao)
    return db_solicitacao


@router.patch("/solicitacoes/{id}/status", response_model=SolicitacaoRead)
def update_solicitacao_status(
    id: int,
    update_data: SolicitacaoUpdateStatus,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_solicitacao = db.query(SolicitacaoPlantio).filter(SolicitacaoPlantio.id == id).first()

    if not db_solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_solicitacao.canteiro_id).first()

    exigir_lider_da_horta(lider, canteiro.horta_id)

    db_solicitacao.status = update_data.status
    db.commit()
    db.refresh(db_solicitacao)
    return db_solicitacao


@router.delete("/solicitacoes/{id}")
def delete_solicitacao(
    id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    db_solicitacao = db.query(SolicitacaoPlantio).filter(SolicitacaoPlantio.id == id).first()

    if not db_solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_solicitacao.canteiro_id).first()

    exigir_dono_do_canteiro(usuario, canteiro)
    exigir_lider_da_horta(usuario, canteiro.horta_id)

    db.delete(db_solicitacao)
    db.commit()

    return {"detail": "Solicitação removida com sucesso."}
