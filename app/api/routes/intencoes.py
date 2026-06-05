from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import IntencaoPlantio, Produto, Usuario
from app.schemas.intencao import IntencaoCreate, IntencaoUpdate, IntencaoRead
from app.api.dependencies import get_lider_user
from app.api.permissions import exigir_lider_da_horta

router = APIRouter(tags=["Intenções"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/intencoes", response_model=list[IntencaoRead])
def read_intencoes(
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_lider_user)]
):
    if usuario.privilegio == "LIDER_HORTA":
        return db.query(IntencaoPlantio).filter(IntencaoPlantio.horta_id == usuario.horta_id).all()
    return db.query(IntencaoPlantio).all()

@router.post("/hortas/{horta_id}/intencoes", response_model=IntencaoRead, status_code=201)
def create_intencao(
    horta_id: int,
    intencao: IntencaoCreate,
    db: DBDep,
    response: Response,
    lider: Annotated[Usuario, Depends(get_lider_user)],
):
    exigir_lider_da_horta(lider, horta_id)

    produto_existe = db.query(Produto).filter(Produto.id == intencao.produto_id).first()
    if not produto_existe:
        raise HTTPException(
            status_code=404,
            detail="O produto selecionado não existe no catálogo oficial."
        )

    db_intencao = IntencaoPlantio(**intencao.model_dump(), horta_id=horta_id)
    db.add(db_intencao)
    db.commit()
    response.headers["Location"] = f"/intencoes/{db_intencao.id}"
    return db_intencao

@router.patch("/intencoes/{id}", response_model=IntencaoRead)
def update_intencao(
    id: int,
    intencao: IntencaoUpdate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_intencao = db.query(IntencaoPlantio).filter(IntencaoPlantio.id == id).first()

    if not db_intencao:
        raise HTTPException(404, "Intenção não encontrada")

    exigir_lider_da_horta(lider, db_intencao.horta_id)

    for key, value in intencao.model_dump(exclude_unset=True).items():
        setattr(db_intencao, key, value)

    db.commit()
    return db_intencao

# Hard delete intencional: intenção é um "ticket" de planejamento de plantio.
# Diferente das entidades de vida longa (Horta/Canteiro/Ciclo), descartar
# fisicamente uma intenção abandonada não perde informação relevante.
@router.delete("/intencoes/{id}", status_code=204)
def delete_intencao(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_intencao = db.query(IntencaoPlantio).filter(IntencaoPlantio.id == id).first()

    if not db_intencao:
        raise HTTPException(404, "Intenção não encontrada")

    exigir_lider_da_horta(lider, db_intencao.horta_id)

    db.delete(db_intencao)
    db.commit()
