from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Usuario
from app.schemas.usuario import PerfilUpdate, UsuarioCreate, UsuarioRead, UsuarioReadCompleto, UsuarioUpdate
from app.dependencies import get_current_user, get_lider_user
from app.permissions import exigir_lider_da_horta, exigir_lider_pode_criar_usuario
from app.core.security import get_password_hash

router = APIRouter(tags=["Usuários"])

DBDep = Annotated[Session, Depends(get_db)]

@router.get("/usuarios", response_model=list[UsuarioRead])
def read_users(
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    if lider.privilegio == "LIDER_HORTA":
        return db.query(Usuario).filter(
            Usuario.horta_id == lider.horta_id, 
            Usuario.ativo == True 
        ).all()
        
    return db.query(Usuario).filter(Usuario.ativo == True).all()

@router.get("/usuarios/me", response_model=UsuarioReadCompleto)
def read_users_me(
    response: Response,
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    # /usuarios/me é chamada em quase toda tela. Privilegios mudam só por
    # ação de admin; o resto exige update explícito. 60s de cache local
    # poupa ~6-10 requests por sessão sem risco de mostrar dados defasados.
    response.headers["Cache-Control"] = "private, max-age=60"
    response.headers["Vary"] = "Accept-Encoding"
    return current_user

@router.patch("/usuarios/me", response_model=UsuarioReadCompleto)
def update_me(
    dados: PerfilUpdate,
    db: DBDep,
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(current_user, campo, valor)
    db.commit()
    return current_user

@router.post("/usuarios", response_model=UsuarioReadCompleto, status_code=201)
def create_usuario(
    usuario: UsuarioCreate,
    db: DBDep,
    response: Response,
    usuario_logado: Annotated[Usuario, Depends(get_lider_user)],
):
    if usuario_logado.privilegio == "LIDER_HORTA":
        usuario.horta_id = usuario_logado.horta_id
        exigir_lider_pode_criar_usuario(usuario_logado, usuario.privilegio)

    senha_criptografada = get_password_hash(usuario.cpf)
    db_usuario = Usuario(**usuario.model_dump(), senha_hash=senha_criptografada)
    db.add(db_usuario)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        # diag.constraint_name é o nome reportado pelo Postgres (ex: "Usuarios_cpf_key")
        constraint = (getattr(getattr(e.orig, "diag", None), "constraint_name", "") or "").lower()
        if "cpf" in constraint:
            raise HTTPException(409, "Este CPF já está cadastrado.")
        if "email" in constraint:
            raise HTTPException(409, "Este Email já está cadastrado.")
        raise  # Outras violações caem no handler global em app/main.py

    response.headers["Location"] = f"/usuarios/{db_usuario.id}"
    return db_usuario

@router.patch("/usuarios/{id}", response_model=UsuarioRead)
def update_usuario(
    id: int,
    usuario_update: UsuarioUpdate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_usuario = db.query(Usuario).filter(Usuario.id == id).first()

    if not db_usuario:
        raise HTTPException(404, "Usuário não encontrado")

    exigir_lider_da_horta(lider, db_usuario.horta_id)

    dados = usuario_update.model_dump(exclude_unset=True)

    if lider.privilegio == "LIDER_HORTA":
        if "privilegio" in dados:
            exigir_lider_pode_criar_usuario(lider, dados["privilegio"])
        if "horta_id" in dados and dados["horta_id"] != lider.horta_id:
            raise HTTPException(403, "Líderes não podem mover usuários para outra horta.")

    if "cpf" in dados and dados["cpf"] != db_usuario.cpf:
        if db.query(Usuario).filter(Usuario.cpf == dados["cpf"], Usuario.id != id).first():
            raise HTTPException(status_code=409, detail="Este CPF já está cadastrado.")

    if "email" in dados and dados["email"] != db_usuario.email:
        if db.query(Usuario).filter(Usuario.email == dados["email"], Usuario.id != id).first():
            raise HTTPException(status_code=409, detail="Este Email já está cadastrado.")

    for key, value in dados.items():
        setattr(db_usuario, key, value)

    db.commit()
    return db_usuario

@router.delete("/usuarios/{id}", status_code=204)
def delete_usuario(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_usuario = db.query(Usuario).filter(Usuario.id == id).first()

    if not db_usuario:
        raise HTTPException(404, "Usuário não encontrado")

    exigir_lider_da_horta(lider, db_usuario.horta_id)

    db_usuario.ativo = False
    db_usuario.deletado_em = datetime.now(timezone.utc)
    db.commit()
