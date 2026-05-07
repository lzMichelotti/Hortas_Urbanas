from datetime import datetime, timedelta, timezone
from typing import Annotated
import jwt
import bcrypt
from jwt.exceptions import InvalidTokenError
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal, Usuario 

SECRET_KEY = "7094f1a8b96be055e09c851bf04ce80615938e4c1143306c0185e518d2b9e6fa"
ALGORITHM = "HS256" 
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(tags=["Autenticação"])

# -------- SCHEMAS PYDANTIC -------- #
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id_usuario: str | None = None


# -------- FUNÇÕES DE CRIPTOGRAFIA (BCRYPT) -------- #
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


# -------- FUNÇÃO PARA GERAR O JWT REAL -------- #
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Adiciona a data de validade (exp) no pacote
    to_encode.update({"exp": expire})
    # Lacra e assina o pacote usando a sua SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# -------- INJEÇÃO DE DEPENDÊNCIAS -------- #
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DBDep = Annotated[Session, Depends(get_db)]


##                    ROTA DE LOGIN                        ##

@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DBDep
):
    # Busca pelo Email (mas o formulário OAuth2 chama de username)
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
        
    #Confere a Senha (O CPF digitado contra a hash do banco)
    if not verify_password(form_data.password, usuario_no_banco.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha (CPF) incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Sucesso! Monta os dados do crachá e gera o JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # "sub" é o padrão JWT para subject (o dono do token). Guardaremos o ID.
    access_token = create_access_token(
        data={"sub": str(usuario_no_banco.id)}, 
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


##               A DEPENDÊNCIA (O SEGURANÇA)                 ##

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DBDep):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Tenta abrir o pacote e ler o que tem dentro
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id_usuario: str = payload.get("sub")
        
        if id_usuario is None:
            raise credentials_exception
            
        token_data = TokenData(id_usuario=id_usuario)
        
    except InvalidTokenError:
        # Cai aqui se o token for falso, alterado ou estiver vencido
        raise credentials_exception
        
    # Com o ID em mãos, busca a pessoa no banco de verdade
    usuario = db.query(Usuario).filter(Usuario.id == int(token_data.id_usuario)).first()
    
    if usuario is None:
        raise credentials_exception
        
    return usuario

##             DEPEDENCIAS DE ACESSO               ####

def get_admin_user(current_user: Annotated[Usuario, Depends(get_current_user)]):
    if current_user.privilegio != "ADMIN_SUPREMO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, #servidor entendeu a solicitação, mas não autoriza
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

#Não tem get para membro pois o nível membro é o mais baixo, se passar pelo get_current_user ja é no mínimo membro


##               ROTA PROTEGIDA (TESTE)                      ##

@router.get("/users/me")
def read_users_me(current_user: Annotated[Usuario, Depends(get_current_user)]):
    # Retorna o usuário decodificado pelo segurança
    return current_user

