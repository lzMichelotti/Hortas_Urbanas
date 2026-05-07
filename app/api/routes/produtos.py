from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Produto, Usuario
from app.api.dependencies import get_current_user

router = APIRouter(tags=["Produtos"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/produtos")
def read_produtos(
    db: DBDep, 
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    return db.query(Produto).all()

@router.get("/produtos/{id}")
def read_produto_por_id(
    id: int, 
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    return db.query(Produto).filter(Produto.id == id).first()
