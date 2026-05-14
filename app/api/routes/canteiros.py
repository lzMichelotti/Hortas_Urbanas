from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Canteiro, Usuario
from app.schemas.canteiro import CanteiroCreate, CanteiroRead
from app.api.dependencies import get_lider_user, verificar_horta
from app.api.permissions import exigir_lider_da_horta

router = APIRouter(tags=["Canteiros"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/canteiros", response_model=list[CanteiroRead])
def read_canteiros(
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    if lider.privilegio == "LIDER_HORTA":
        return db.query(Canteiro).filter(Canteiro.horta_id == lider.horta_id).all()

    return db.query(Canteiro).all()

@router.post("/hortas/{horta_id}/canteiros", response_model=CanteiroRead)
def create_canteiro(
    horta_id: int,
    canteiro: CanteiroCreate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    verificar_horta(lider, horta_id)

    if canteiro.usuario_id is not None:
        usuario = db.query(Usuario).filter(
            Usuario.id == canteiro.usuario_id,
            Usuario.horta_id == horta_id
        ).first()
        if not usuario:
            raise HTTPException(400, "Usuário não pertence a esta horta")

    db_canteiro = Canteiro(**canteiro.model_dump(), horta_id=horta_id)
    db.add(db_canteiro)
    db.commit()
    db.refresh(db_canteiro)
    return db_canteiro

@router.put("/canteiros/{id}", response_model=CanteiroRead)
def update_canteiro(
    id: int,
    canteiro: CanteiroCreate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_canteiro = db.query(Canteiro).filter(Canteiro.id == id).first()

    if not db_canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    exigir_lider_da_horta(lider, db_canteiro.horta_id)

    dados = canteiro.model_dump(exclude_unset=True)

    if "usuario_id" in dados and dados["usuario_id"] is not None:
        usuario = db.query(Usuario).filter(
            Usuario.id == dados["usuario_id"],
            Usuario.horta_id == db_canteiro.horta_id
        ).first()
        if not usuario:
            raise HTTPException(400, "Usuário não pertence a esta horta")

    for key, value in dados.items():
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

    exigir_lider_da_horta(lider, db_canteiro.horta_id)

    db.delete(db_canteiro)
    db.commit()

    return {"detail": "Canteiro removido com sucesso"}
