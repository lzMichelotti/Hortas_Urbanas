from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Canteiro, Demanda, Usuario
from app.schemas.demanda import (
    DemandaCreate, DemandaMembroCreate, DemandaUpdate, DemandaRead, DemandaUpdateStatus,
)
from app.dependencies import get_current_user, get_lider_user
from app.permissions import exigir_acesso_horta, exigir_dono_do_canteiro, exigir_lider_da_horta

router = APIRouter(tags=["Demandas"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/demandas", response_model=list[DemandaRead])
def read_demandas(
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    query = db.query(Demanda).filter(Demanda.ativo == True)
    if usuario.privilegio == "LIDER_HORTA":
        query = query.filter(Demanda.horta_id == usuario.horta_id)
    else:
        query = query.filter(Demanda.canteiro_id.is_(None))
    return query.all()


@router.get("/canteiros/{canteiro_id}/demandas", response_model=list[DemandaRead])
def read_demandas_do_canteiro(
    canteiro_id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)],
):
    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()
    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(usuario, canteiro.horta_id)
    exigir_dono_do_canteiro(usuario, canteiro)

    return (
        db.query(Demanda)
        .filter(Demanda.canteiro_id == canteiro_id, Demanda.ativo == True)
        .all()
    )


@router.post("/canteiros/{canteiro_id}/demandas", response_model=DemandaRead, status_code=201)
def create_demanda_membro(
    canteiro_id: int,
    demanda: DemandaMembroCreate,
    db: DBDep,
    response: Response,
    usuario: Annotated[Usuario, Depends(get_current_user)],
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
    db.add(db_demanda)
    db.commit()
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
        Demanda.ativo == True,
    ).first()

    if not db_demanda:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()
    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    exigir_acesso_horta(usuario, canteiro.horta_id)
    exigir_dono_do_canteiro(usuario, canteiro)

    db_demanda.ativo = False
    db_demanda.deletado_em = datetime.now(timezone.utc)
    db.commit()

@router.post("/hortas/{horta_id}/demandas", response_model=DemandaRead, status_code=201)
def create_demanda(
    horta_id: int,
    demanda: DemandaCreate,
    db: DBDep,
    response: Response,
    lider: Annotated[Usuario, Depends(get_lider_user)],
):
    exigir_lider_da_horta(lider, horta_id)

    db_demanda = Demanda(**demanda.model_dump(), horta_id=horta_id)
    db.add(db_demanda)
    db.commit()
    response.headers["Location"] = f"/demandas/{db_demanda.id}"
    return db_demanda

@router.patch("/demandas/{id}", response_model=DemandaRead)
def update_demanda(
    id: int,
    demanda: DemandaUpdate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_demanda = db.query(Demanda).filter(Demanda.id == id, Demanda.ativo == True).first()

    if not db_demanda:
        raise HTTPException(404, "Demanda não encontrada")

    exigir_lider_da_horta(lider, db_demanda.horta_id)

    for key, value in demanda.model_dump(exclude_unset=True).items():
        setattr(db_demanda, key, value)

    db.commit()
    return db_demanda

@router.patch("/hortas/{horta_id}/demandas/{demanda_id}/status", response_model=DemandaRead)
def update_demanda_status(
    horta_id: int,
    demanda_id: int,
    update_data: DemandaUpdateStatus,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    exigir_lider_da_horta(lider, horta_id)
    db_demanda = db.query(Demanda).filter(
        Demanda.id == demanda_id,
        Demanda.horta_id == horta_id,
        Demanda.ativo == True
    ).first()

    if not db_demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada nesta horta.")

    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(db_demanda, key, value)

    db.commit()
    return db_demanda

@router.delete("/demandas/{id}", status_code=204)
def delete_demanda(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_demanda = db.query(Demanda).filter(Demanda.id == id, Demanda.ativo == True).first()

    if not db_demanda:
        raise HTTPException(404, "Demanda não encontrada")

    exigir_lider_da_horta(lider, db_demanda.horta_id)

    db_demanda.ativo = False
    db_demanda.deletado_em = datetime.now(timezone.utc)
    db.commit()
