from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Canteiro, CicloProducao, Usuario
from app.schemas.canteiro import (
    CanteiroCreate, CanteiroUpdate, CanteiroRead, ProdutividadeCanteiro,
)
from app.dependencies import get_current_user, get_lider_user
from app.permissions import exigir_lider_da_horta

router = APIRouter(tags=["Canteiros"])

DBDep = Annotated[Session, Depends(get_db)]

# Previsão de colheita é estimativa: só conta como atraso além desta folga.
TOLERANCIA_ATRASO_DIAS = 3

@router.get("/canteiros", response_model=list[CanteiroRead])
def read_canteiros(
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)],
):
    query = db.query(Canteiro).filter(Canteiro.ativo == True)
    if usuario.privilegio == "LIDER_HORTA":
        query = query.filter(Canteiro.horta_id == usuario.horta_id)
    elif usuario.privilegio == "MEMBRO_CANTEIRO":
        query = query.filter(Canteiro.usuario_id == usuario.id)
    return query.all()

@router.get("/hortas/{horta_id}/produtividade", response_model=list[ProdutividadeCanteiro])
def read_produtividade(
    horta_id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)],
):
    """Um GROUP BY por canteiro — evita o N+1 de buscar ciclos canteiro a canteiro.
    LEFT JOIN garante que canteiro sem ciclos aparece zerado."""
    exigir_lider_da_horta(lider, horta_id)

    # count(*) FILTER (WHERE status = ...) — conta por status numa varredura só.
    def contar(status: str):
        return func.count().filter(CicloProducao.status == status)

    data_corte = datetime.now(timezone.utc).date() - timedelta(days=TOLERANCIA_ATRASO_DIAS)
    atrasadas = func.count().filter(
        CicloProducao.status.notin_(("COLHIDO", "PERDIDO")),
        CicloProducao.previsao_colheita < data_corte,
    )

    rows = (
        db.query(
            Canteiro.id.label("canteiro_id"),
            Canteiro.identificacao,
            Usuario.nome.label("responsavel"),
            contar("PLANTADO").label("plantadas"),
            contar("EM_CRESCIMENTO").label("crescendo"),
            contar("PRONTO_PARA_COLHEITA").label("prontas"),
            contar("COLHIDO").label("colheitas"),
            func.coalesce(
                func.sum(CicloProducao.quantidade).filter(CicloProducao.status == "COLHIDO"),
                0,
            ).label("colhido_total"),
            contar("PERDIDO").label("perdas"),
            atrasadas.label("atrasadas"),
        )
        .outerjoin(
            CicloProducao,
            and_(CicloProducao.canteiro_id == Canteiro.id, CicloProducao.ativo == True),
        )
        .outerjoin(Usuario, Usuario.id == Canteiro.usuario_id)
        .filter(Canteiro.horta_id == horta_id, Canteiro.ativo == True)
        .group_by(Canteiro.id, Usuario.nome)
        .order_by(Canteiro.identificacao)
        .all()
    )

    return [ProdutividadeCanteiro(**row._mapping) for row in rows]

@router.post("/hortas/{horta_id}/canteiros", response_model=CanteiroRead, status_code=201)
def create_canteiro(
    horta_id: int,
    canteiro: CanteiroCreate,
    db: DBDep,
    response: Response,
    lider: Annotated[Usuario, Depends(get_lider_user)],
):
    exigir_lider_da_horta(lider, horta_id)

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
    response.headers["Location"] = f"/canteiros/{db_canteiro.id}"
    return db_canteiro

@router.patch("/canteiros/{id}", response_model=CanteiroRead)
def update_canteiro(
    id: int,
    canteiro: CanteiroUpdate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_canteiro = db.query(Canteiro).filter(Canteiro.id == id, Canteiro.ativo == True).first()

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
    return db_canteiro

@router.delete("/canteiros/{id}", status_code=204)
def delete_canteiro(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_canteiro = db.query(Canteiro).filter(Canteiro.id == id, Canteiro.ativo == True).first()

    if not db_canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    exigir_lider_da_horta(lider, db_canteiro.horta_id)

    db_canteiro.ativo = False
    db_canteiro.deletado_em = datetime.now(timezone.utc)
    db.commit()
