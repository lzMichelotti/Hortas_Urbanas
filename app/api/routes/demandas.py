from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Demanda, Usuario
from app.schemas.demanda import DemandaCreate, DemandaUpdateStatus
from app.api.dependencies import get_current_user, get_lider_user, verificar_horta
from app.api.permissions import exigir_lider_da_horta

router = APIRouter(tags=["Demandas"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/demandas")
def read_demandas(
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    return db.query(Demanda).filter(Demanda.ativo == True).all()

@router.post("/hortas/{horta_id}/demandas")
def create_demanda(
    horta_id: int, 
    demanda: DemandaCreate, 
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    verificar_horta(lider, horta_id)
        
    db_demanda = Demanda(**demanda.model_dump(), horta_id=horta_id)
    db.add(db_demanda)
    db.commit()
    db.refresh(db_demanda)
    return db_demanda

@router.put("/demandas/{id}")
def update_demanda(
    id: int,
    demanda: DemandaCreate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_demanda = db.query(Demanda).filter(Demanda.id == id).first()

    if not db_demanda:
        raise HTTPException(404, "Demanda não encontrada")

    exigir_lider_da_horta(lider, db_demanda.horta_id)

    for key, value in demanda.model_dump(exclude_unset=True).items():
        setattr(db_demanda, key, value)

    db.commit()
    db.refresh(db_demanda)
    return db_demanda

@router.patch("/hortas/{horta_id}/demandas/{demanda_id}/status")
def update_demanda_status(
    horta_id: int, 
    demanda_id: int, 
    update_data: DemandaUpdateStatus, 
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    verificar_horta(lider, horta_id)
    db_demanda = db.query(Demanda).filter(
        Demanda.id == demanda_id, 
        Demanda.horta_id == horta_id
    ).first()

    if not db_demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada nesta horta.")

    update_dict = update_data.model_dump(exclude_unset=True)
    
    for key, value in update_dict.items():
        setattr(db_demanda, key, value)

    db.commit()
    db.refresh(db_demanda)
    return db_demanda

@router.delete("/demandas/{id}")
def delete_demanda(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_demanda = db.query(Demanda).filter(Demanda.id == id).first()

    if not db_demanda:
        raise HTTPException(404, "Demanda não encontrada")

    exigir_lider_da_horta(lider, db_demanda.horta_id)

    db_demanda.ativo = False
    db_demanda.deletado_em = datetime.now()
    db.commit()

    return {"detail": "Demanda removida com sucesso"}
