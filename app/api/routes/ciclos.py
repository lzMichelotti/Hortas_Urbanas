from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Canteiro, CicloProducao, Usuario
from app.schemas.ciclo import CicloCreate, CicloUpdate, CicloRead
from app.api.dependencies import get_current_user
from app.api.permissions import exigir_acesso_horta, exigir_dono_do_canteiro
from app.core.idempotency import IdempotencyKeyHeader, commit_idempotente

router = APIRouter(tags=["Ciclos"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/canteiros/{canteiro_id}/ciclos", response_model=list[CicloRead])
def read_ciclos_do_canteiro(
    canteiro_id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()

    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(usuario, canteiro.horta_id)

    return (
        db.query(CicloProducao)
        .filter(CicloProducao.canteiro_id == canteiro_id, CicloProducao.ativo == True)
        .all()
    )

@router.post("/canteiros/{canteiro_id}/ciclos", response_model=CicloRead, status_code=201)
def create_ciclo(
    canteiro_id: int,
    ciclo: CicloCreate,
    db: DBDep,
    response: Response,
    membro: Annotated[Usuario, Depends(get_current_user)],
    idempotency_key: IdempotencyKeyHeader = None,
):
    canteiro_banco = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()

    if not canteiro_banco:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(membro, canteiro_banco.horta_id)
    exigir_dono_do_canteiro(membro, canteiro_banco)

    db_ciclo = CicloProducao(**ciclo.model_dump(), canteiro_id=canteiro_id)
    db_ciclo = commit_idempotente(db, db_ciclo, idempotency_key, canteiro_id=canteiro_id)
    response.headers["Location"] = f"/ciclos/{db_ciclo.id}"
    return db_ciclo

@router.patch("/ciclos/{id}", response_model=CicloRead)
def update_ciclo(
    id: int,
    ciclo: CicloUpdate,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    db_ciclo = db.query(CicloProducao).filter(CicloProducao.id == id, CicloProducao.ativo == True).first()

    if not db_ciclo:
        raise HTTPException(404, "Ciclo não encontrado")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_ciclo.canteiro_id).first()

    if not canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    exigir_acesso_horta(usuario, canteiro.horta_id)
    exigir_dono_do_canteiro(usuario, canteiro)

    for key, value in ciclo.model_dump(exclude_unset=True).items():
        setattr(db_ciclo, key, value)

    db.commit()
    return db_ciclo

@router.delete("/ciclos/{id}", status_code=204)
def delete_ciclo(
    id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    db_ciclo = db.query(CicloProducao).filter(CicloProducao.id == id, CicloProducao.ativo == True).first()

    if not db_ciclo:
        raise HTTPException(404, "Ciclo não encontrado")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_ciclo.canteiro_id).first()

    if not canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    exigir_acesso_horta(usuario, canteiro.horta_id)
    exigir_dono_do_canteiro(usuario, canteiro)

    db_ciclo.ativo = False
    db_ciclo.deletado_em = datetime.now(timezone.utc)
    db.commit()
