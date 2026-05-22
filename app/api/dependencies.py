from typing import Annotated
import jwt
from jwt.exceptions import InvalidTokenError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Usuario
from app.core.config import settings
from app.schemas.auth import TokenData

DBDep = Annotated[Session, Depends(get_db)]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DBDep):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub"]},
        )

        if payload.get("type") != "access":
            raise credentials_exception

        token_data = TokenData(id_usuario=payload["sub"])

    except InvalidTokenError:
        raise credentials_exception

    usuario = db.query(Usuario).filter(Usuario.id == int(token_data.id_usuario)).first()

    if usuario is None or not usuario.ativo:
        raise credentials_exception

    return usuario

def get_admin_user(current_user: Annotated[Usuario, Depends(get_current_user)]):
    if current_user.privilegio != "ADMIN_SUPREMO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Ação restrita a Administradores"
        )
    return current_user

def get_lider_user(current_user: Annotated[Usuario, Depends(get_current_user)]):
    if current_user.privilegio not in ["ADMIN_SUPREMO", "LIDER_HORTA"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Requer nível de Líder de Horta"
        )
    return current_user
