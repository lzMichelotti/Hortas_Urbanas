from typing import Annotated
from fastapi import Depends, APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import bcrypt

from database import SessionLocal, Usuario 

router = APIRouter(tags=["Autenticação"])
 
#-------- BCRYPT -----------#
def get_password_hash(password: str) -> str:
    # Embaralha a senha
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Confere a senha digitada com a do banco
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )
# O tokenUrl aponta para a rota "/token" que vamos criar abaixo.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DBDep = Annotated[Session, Depends(get_db)]

##                     ROTA DE LOGIN                         ##

@router.post("/token")
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: DBDep):
    
    #OAuth2 obriga o nome "username", mas sabemos que o usuário digitou o EMAIL.
    usuario_no_banco = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    # Se não achou ninguém com esse email:
    if not usuario_no_banco:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha (CPF) incorretos"
        )
        
    # CONFERE A SENHA (O CPF):
    # O form_data.password é o CPF cru que o usuário digitou. 
    # O usuario_no_banco.senha_hash é o CPF embaralhado que salvamos no banco antes.
    senha_correta = verify_password(form_data.password, usuario_no_banco.senha_hash)
    
    if not senha_correta:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha (CPF) incorretos"
        )
        

    # Por enquanto, retornamos o ID do usuário como se fosse o token para você ver funcionando.
    # No próximo passo, trocaremos isso pelo Token JWT real.
    return {"access_token": str(usuario_no_banco.id), "token_type": "bearer"}

##               A DEPENDÊNCIA (O SEGURANÇA)                 ##

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DBDep):
    # (No futuro, aqui nós vamos abrir o Token JWT)
    # Por enquanto, como o nosso "token mockado" é o próprio ID do usuário:
    
    usuario = db.query(Usuario).filter(Usuario.id == int(token)).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario

##               ROTA PROTEGIDA (TESTE)                      ##

@router.get("/users/me")
def read_users_me(current_user: Annotated[Usuario, Depends(get_current_user)]):
    # Retorna as informações do usuário logado (SQLAlchemy já formata isso)
    return current_user