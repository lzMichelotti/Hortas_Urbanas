import logging
from datetime import timedelta
from typing import Annotated
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Usuario
from app.schemas.auth import Token, RefreshRequest
from app.core.config import settings
from app.core.security import (
    create_access_token, create_refresh_token,
    decode_refresh_token, verify_password, get_password_hash,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Autenticação"])

DBDep = Annotated[Session, Depends(get_db)]

# Hash fictício usado para manter tempo de resposta constante quando o usuário não existe
_DUMMY_HASH = get_password_hash("__dummy__")


@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DBDep
):
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()

    # Sempre executa bcrypt para evitar timing attack (enumeração de usuários por tempo)
    hash_para_verificar = usuario.senha_hash if usuario else _DUMMY_HASH
    senha_valida = verify_password(form_data.password, hash_para_verificar)

    if not usuario or not senha_valida:
        logger.warning("Login falhou para email '%s' — credenciais inválidas", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.ativo:
        logger.warning("Login bloqueado para usuário id=%d — conta inativa", usuario.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Conta de usuário inativa ou excluída.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info("Login bem-sucedido: usuário id=%d (%s)", usuario.id, usuario.email)
    access_token = create_access_token(
        data={"sub": str(usuario.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(usuario.id)

    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")


@router.post("/token/refresh", response_model=Token)
def refresh_access_token(body: RefreshRequest, db: DBDep):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        id_usuario = decode_refresh_token(body.refresh_token)
    except jwt.exceptions.PyJWTError:
        logger.warning("Refresh token inválido ou expirado")
        raise credentials_exception

    usuario = db.query(Usuario).filter(Usuario.id == int(id_usuario)).first()

    if not usuario or not usuario.ativo:
        raise credentials_exception

    access_token = create_access_token(
        data={"sub": str(usuario.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh_token = create_refresh_token(usuario.id)

    return Token(access_token=access_token, refresh_token=new_refresh_token, token_type="bearer")
