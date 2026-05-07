from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Usuario
from app.schemas.auth import Token
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.security import create_access_token, verify_password

router = APIRouter(tags=["Autenticação"])

DBDep = Annotated[Session, Depends(get_db)]

@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DBDep
):
    usuario_no_banco = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    if not usuario_no_banco:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha (CPF) incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not usuario_no_banco.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Conta de usuário inativa ou excluída.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(form_data.password, usuario_no_banco.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha (CPF) incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token(
        data={"sub": str(usuario_no_banco.id)}, 
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")
