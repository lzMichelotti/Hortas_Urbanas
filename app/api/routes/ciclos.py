from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Canteiro, CicloProducao, Usuario
from app.schemas.ciclo import CicloCreate
from app.api.dependencies import get_current_user

router = APIRouter(tags=["Ciclos"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/canteiros/{canteiro_id}/ciclos")
def read_ciclos_do_canteiro(
    canteiro_id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    canteiro = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()

    if not canteiro:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")

    if usuario.privilegio != "ADMIN_SUPREMO" and canteiro.horta_id != usuario.horta_id:
        raise HTTPException(status_code=403, detail="Sem permissão para acessar ciclos desta horta.")

    return db.query(CicloProducao).filter(CicloProducao.canteiro_id == canteiro_id).all()

@router.post("/canteiros/{canteiro_id}/ciclos")
def create_ciclo(
    canteiro_id: int, 
    ciclo: CicloCreate, 
    db: DBDep,
    membro: Annotated[Usuario, Depends(get_current_user)]
):
    canteiro_banco = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()
    
    if not canteiro_banco:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")
        
    if membro.privilegio == "MEMBRO_CANTEIRO" and canteiro_banco.usuario_id != membro.id:
        raise HTTPException(
            status_code=403, 
            detail="Você só pode registrar plantios no seu próprio canteiro."
        )

    db_ciclo = CicloProducao(**ciclo.model_dump(), canteiro_id=canteiro_id)
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@router.put("/ciclos/{id}")
def update_ciclo(
    id: int,
    ciclo: CicloCreate,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    db_ciclo = db.query(CicloProducao).filter(CicloProducao.id == id).first()

    if not db_ciclo:
        raise HTTPException(404, "Ciclo não encontrado")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_ciclo.canteiro_id).first()

    if usuario.privilegio == "MEMBRO_CANTEIRO" and canteiro.usuario_id != usuario.id:
        raise HTTPException(403, "Sem permissão")

    for key, value in ciclo.model_dump(exclude_unset=True).items():
        setattr(db_ciclo, key, value)

    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@router.delete("/ciclos/{id}")
def delete_ciclo(
    id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    db_ciclo = db.query(CicloProducao).filter(CicloProducao.id == id).first()

    if not db_ciclo:
        raise HTTPException(404, "Ciclo não encontrado")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_ciclo.canteiro_id).first()

    if usuario.privilegio == "MEMBRO_CANTEIRO" and canteiro.usuario_id != usuario.id:
        raise HTTPException(403, "Sem permissão")

    db.delete(db_ciclo)
    db.commit()

    return {"detail": "Ciclo removido com sucesso"}
