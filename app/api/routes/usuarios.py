from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioRead
from app.api.dependencies import get_current_user, get_lider_user
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

@router.get("/usuarios/me", response_model=UsuarioRead)
def read_users_me(current_user: Annotated[Usuario, Depends(get_current_user)]):
    return current_user

@router.post("/usuarios", response_model=UsuarioRead)
def create_usuario(
    usuario: UsuarioCreate, 
    db: DBDep,
    usuario_logado: Annotated[Usuario, Depends(get_lider_user)] 
):
        
    if usuario_logado.privilegio == "LIDER_HORTA":
        usuario.horta_id = usuario_logado.horta_id
        if usuario.privilegio in ["ADMIN_SUPREMO", "LIDER_HORTA"]:
            raise HTTPException(status_code=403, detail="Líderes só podem criar membros de canteiro.")
            
    cpf_existente = db.query(Usuario).filter(Usuario.cpf == usuario.cpf).first()
    email_existente = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    
    if cpf_existente:
        raise HTTPException(status_code=400, detail="Este CPF já está cadastrado.")
    if email_existente:
        raise HTTPException(status_code=400, detail="Este Email já está cadastrado.")
        
    senha_criptografada = get_password_hash(usuario.cpf)
    
    db_usuario = Usuario(
        **usuario.model_dump(),       
        senha_hash=senha_criptografada 
    )
    
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    
    return db_usuario

@router.put("/usuarios/{id}", response_model=UsuarioRead)
def update_usuario(
    id: int,
    usuario_update: UsuarioCreate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_usuario = db.query(Usuario).filter(Usuario.id == id).first()

    if not db_usuario:
        raise HTTPException(404, "Usuário não encontrado")

    if lider.privilegio == "LIDER_HORTA" and db_usuario.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    dados = usuario_update.model_dump(exclude_unset=True)

    if "cpf" in dados and dados["cpf"] != db_usuario.cpf:
        if db.query(Usuario).filter(Usuario.cpf == dados["cpf"], Usuario.id != id).first():
            raise HTTPException(status_code=400, detail="Este CPF já está cadastrado.")

    if "email" in dados and dados["email"] != db_usuario.email:
        if db.query(Usuario).filter(Usuario.email == dados["email"], Usuario.id != id).first():
            raise HTTPException(status_code=400, detail="Este Email já está cadastrado.")

    for key, value in dados.items():
        setattr(db_usuario, key, value)

    db.commit()
    db.refresh(db_usuario)
    return db_usuario

@router.delete("/usuarios/{id}")
def delete_usuario(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_usuario = db.query(Usuario).filter(Usuario.id == id).first()

    if not db_usuario:
        raise HTTPException(404, "Usuário não encontrado")

    if lider.privilegio == "LIDER_HORTA" and db_usuario.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    db_usuario.ativo = False
    db_usuario.deletado_em = datetime.now()
    db.commit()

    return {"detail": "Usuário removido com sucesso"}
