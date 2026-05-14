from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Horta, Usuario
from app.schemas.horta import (
    HortaCreate, HortaPublica,
    HortaFeature, HortaFeatureCollection,
    PontoGeografico, PropriedadesHorta,
)
from app.api.dependencies import get_admin_user, get_current_user

router = APIRouter(tags=["Hortas"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/hortas", response_model=list[HortaPublica])
def read_hortas(db: DBDep):
    return db.query(Horta).all()

@router.get("/mapa", response_model=HortaFeatureCollection)
def mapa_hortas(db: DBDep):
    """Retorna todas as hortas com coordenadas no formato GeoJSON."""
    hortas = db.query(Horta).filter(
        Horta.latitude.isnot(None),
        Horta.longitude.isnot(None),
    ).all()

    features = [
        HortaFeature(
            geometry=PontoGeografico(coordinates=[h.longitude, h.latitude]),
            properties=PropriedadesHorta(
                id=h.id,
                nome=h.nome,
                rua=h.rua,
                numero=h.numero,
                bairro=h.bairro,
                cidade=h.cidade,
                uf=h.uf,
                area_total=h.area_total,
                publico_atendido=h.publico_atendido,
            ),
        )
        for h in hortas
    ]

    return HortaFeatureCollection(features=features)

@router.get("/hortas/{id}", response_model=HortaPublica)
def read_horta_por_id(id: int, db: DBDep):
    db_horta = db.query(Horta).filter(Horta.id == id).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    return db_horta

@router.put("/hortas/{id}")
def update_horta(
    id: int,
    horta: HortaCreate,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    db_horta = db.query(Horta).filter(Horta.id == id).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    for key, value in horta.model_dump(exclude_unset=True).items():
        setattr(db_horta, key, value)

    db.commit()
    db.refresh(db_horta)
    return db_horta

@router.post("/hortas")
def create_horta(
    horta: HortaCreate, 
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)] 
):
    db_horta = Horta(**horta.model_dump())
    db.add(db_horta)
    db.commit()
    db.refresh(db_horta)
    return db_horta

@router.delete("/hortas/{id}")
def delete_horta(
    id: int,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    db_horta = db.query(Horta).filter(Horta.id == id).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    db.delete(db_horta)
    db.commit()

    return {"detail": "Horta removida com sucesso"}
