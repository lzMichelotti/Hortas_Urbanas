from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Canteiro, Usuario
from app.schemas.canteiro import CanteiroCreate, CanteiroUpdate
from app.api.dependencies import get_lider_user, verificar_horta

router = APIRouter(tags=["Canteiros"])

DBDep = Annotated[Session, Depends(get_db)]


def validar_usuario_da_horta(db: Session, usuario_id: int, horta_id: int):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(404, "Usuário não encontrado")
    if usuario.horta_id != horta_id:
        raise HTTPException(403, "Usuário não pertence à horta do canteiro")

@router.get("/canteiros")
def read_canteiros(
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    if lider.privilegio == "LIDER_HORTA":
        return db.query(Canteiro).filter(Canteiro.horta_id == lider.horta_id).all()
        
    return db.query(Canteiro).all()

@router.post("/hortas/{horta_id}/canteiros")
def create_canteiro(
    horta_id: int, 
    canteiro: CanteiroCreate, 
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    verificar_horta(lider, horta_id)
    if canteiro.usuario_id is not None:
        validar_usuario_da_horta(db, canteiro.usuario_id, horta_id)

    db_canteiro = Canteiro(**canteiro.model_dump(), horta_id=horta_id)
    db.add(db_canteiro)
    db.commit()
    db.refresh(db_canteiro)
    return db_canteiro

@router.put("/canteiros/{id}")
def update_canteiro(
    id: int,
    canteiro: CanteiroUpdate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_canteiro = db.query(Canteiro).filter(Canteiro.id == id).first()

    if not db_canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    if lider.privilegio == "LIDER_HORTA" and db_canteiro.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    canteiro_data = canteiro.model_dump(exclude_unset=True)

    if canteiro_data.get("usuario_id") is not None:
        validar_usuario_da_horta(db, canteiro_data["usuario_id"], db_canteiro.horta_id)

    for key, value in canteiro_data.items():
        setattr(db_canteiro, key, value)

    db.commit()
    db.refresh(db_canteiro)
    return db_canteiro

@router.delete("/canteiros/{id}")
def delete_canteiro(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_canteiro = db.query(Canteiro).filter(Canteiro.id == id).first()

    if not db_canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    if lider.privilegio == "LIDER_HORTA" and db_canteiro.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    db.delete(db_canteiro)
    db.commit()

    return {"detail": "Canteiro removido com sucesso"}
