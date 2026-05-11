from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import IntencaoPlantio, Produto, Usuario
from app.schemas.intencao import IntencaoCreate
from app.api.dependencies import get_lider_user, verificar_horta

router = APIRouter(tags=["Intenções"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/intencoes")
def read_intencoes(
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_lider_user)]
):
    if usuario.privilegio == "LIDER_HORTA":
        return db.query(IntencaoPlantio).filter(IntencaoPlantio.horta_id == usuario.horta_id).all()
    return db.query(IntencaoPlantio).all()

@router.post("/hortas/{horta_id}/intencoes")
def create_intencao(
    horta_id: int, 
    intencao: IntencaoCreate, 
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    verificar_horta(lider, horta_id)

    produto_existe = db.query(Produto).filter(Produto.id == intencao.produto_id).first()
    if not produto_existe:
        raise HTTPException(
            status_code=404, 
            detail="O produto selecionado não existe no catálogo oficial."
        )
        
    db_intencao = IntencaoPlantio(**intencao.model_dump(), horta_id=horta_id)
    db.add(db_intencao)
    db.commit()
    db.refresh(db_intencao)
    return db_intencao

@router.put("/intencoes/{id}")
def update_intencao(
    id: int,
    intencao: IntencaoCreate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_intencao = db.query(IntencaoPlantio).filter(IntencaoPlantio.id == id).first()

    if not db_intencao:
        raise HTTPException(404, "Intenção não encontrada")

    if lider.privilegio == "LIDER_HORTA" and db_intencao.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    for key, value in intencao.model_dump(exclude_unset=True).items():
        setattr(db_intencao, key, value)

    db.commit()
    db.refresh(db_intencao)
    return db_intencao

@router.delete("/intencoes/{id}")
def delete_intencao(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_intencao = db.query(IntencaoPlantio).filter(IntencaoPlantio.id == id).first()

    if not db_intencao:
        raise HTTPException(404, "Intenção não encontrada")

    if lider.privilegio == "LIDER_HORTA" and db_intencao.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    db.delete(db_intencao)
    db.commit()

    return {"detail": "Intenção removida com sucesso"}
