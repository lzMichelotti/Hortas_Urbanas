from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Produto, Usuario
from app.schemas.produto import ProdutoRead
from app.api.dependencies import get_current_user
from app.core.http import aplica_etag

router = APIRouter(tags=["Produtos"])

DBDep = Annotated[Session, Depends(get_db)]

# Catálogo de produtos muda raramente — fresh por 1h, reutilizável por 24h via stale-while-revalidate
_CACHE_CATALOGO = "private, max-age=3600, stale-while-revalidate=86400"


@router.get("/produtos", response_model=list[ProdutoRead])
def read_produtos(
    request: Request,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    produtos = db.query(Produto).filter(Produto.ativo == True).all()
    payload = [ProdutoRead.model_validate(p) for p in produtos]
    return aplica_etag(request, payload, cache_control=_CACHE_CATALOGO)

@router.get("/produtos/{id}", response_model=ProdutoRead)
def read_produto_por_id(
    id: int,
    request: Request,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    produto = db.query(Produto).filter(Produto.id == id, Produto.ativo == True).first()
    if produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return aplica_etag(request, ProdutoRead.model_validate(produto), cache_control=_CACHE_CATALOGO)
