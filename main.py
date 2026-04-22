from fastapi import Depends, FastAPI, HTTPException
from typing import Annotated, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from auth import router as auth_router, get_password_hash

from database import SessionLocal, Horta, Produto, CicloProducao, IntencaoPlantio, Demanda, Canteiro, Usuario

app = FastAPI()

app.include_router(auth_router)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DBDep = Annotated[Session, Depends(get_db)]

## ------------------ SCHEMAS PYDANTIC ------------------ ##
# Validação dos dados que chegam do aplicativo

class HortaCreate(BaseModel):
    nome: str
    rua: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_total: float
    publico_atendido: Optional[str] = None

class CanteiroCreate(BaseModel):
    usuario_id: Optional[int] = None 
    identificacao: str
    area_produtiva: float
    area_ociosa: float

class DemandaCreate(BaseModel):
    tipo_demanda: str
    descricao: str
    status: str

class CicloCreate(BaseModel):
    # O canteiro_id foi removido daqui pois virá da URL!
    produto_id: int
    data_plantio: date
    previsao_colheita: date
    status: str

class IntencaoCreate(BaseModel):
    produto_id: int
    justificativa_comunidade: Optional[str] = None
    data_desejada_plantio: Optional[date] = None
    status: str

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    cpf: str
    telefone: str
    privilegio: str
    horta_id: Optional[int] = None # Nem todo mundo (ex: Admin Supremo) tem uma horta fixa

## ------------------------ GET ------------------------ ##

@app.get("/hortas")
def read_hortas(db: DBDep):
    return db.query(Horta).all()
@app.get("/usuarios")
def read_users(db: DBDep):
    return db.query(Usuario).all()

@app.get("/produtos")
def read_produtos(db: DBDep):
    return db.query(Produto).all()

@app.get("/produtos/{id}")
def read_produto_por_id(id: int, db: DBDep):
    return db.query(Produto).filter(Produto.id == id).first()

@app.get("/hortas/{id}")
def read_horta_por_id(id: int, db: DBDep):
    return db.query(Horta).filter(Horta.id == id).first()

@app.get("/canteiros")
def read_canteiros(db: DBDep):
    return db.query(Canteiro).all()

@app.get("/canteiros/{id}/ciclos")
def read_ciclos_do_canteiro(id: int, db: DBDep):
    return db.query(CicloProducao).filter(CicloProducao.canteiro_id == id).all()

@app.get("/demandas")
def read_demandas(db: DBDep):
    return db.query(Demanda).all()

@app.get("/intencoes")
def read_intencoes(db: DBDep):
    return db.query(IntencaoPlantio).all()

## ------------------------ POST ------------------------ ##

@app.post("/hortas")
def create_horta(horta: HortaCreate, db: DBDep):
    db_horta = Horta(**horta.model_dump())
    db.add(db_horta)
    db.commit()
    db.refresh(db_horta)
    return db_horta

@app.post("/hortas/{horta_id}/canteiros")
def create_canteiro(horta_id: int, canteiro: CanteiroCreate, db: DBDep):
    # Desempacota os dados e injeta o ID da horta da URL
    db_canteiro = Canteiro(**canteiro.model_dump(), horta_id=horta_id)
    db.add(db_canteiro)
    db.commit()
    db.refresh(db_canteiro)
    return db_canteiro

@app.post("/hortas/{horta_id}/demandas")
def create_demanda(horta_id: int, demanda: DemandaCreate, db: DBDep):
    db_demanda = Demanda(**demanda.model_dump(), horta_id=horta_id)
    db.add(db_demanda)
    db.commit()
    db.refresh(db_demanda)
    return db_demanda

@app.post("/hortas/{horta_id}/intencoes")
def create_intencao(horta_id: int, intencao: IntencaoCreate, db: DBDep):
    db_intencao = IntencaoPlantio(**intencao.model_dump(), horta_id=horta_id)
    db.add(db_intencao)
    db.commit()
    db.refresh(db_intencao)
    return db_intencao

@app.post("/canteiros/{canteiro_id}/ciclos")
def create_ciclo(canteiro_id: int, ciclo: CicloCreate, db: DBDep):
    # Desempacota os dados do plantio e injeta o ID do canteiro da URL
    db_ciclo = CicloProducao(**ciclo.model_dump(), canteiro_id=canteiro_id)
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@app.post("/usuarios")
def create_usuario(usuario: UsuarioCreate, db: DBDep):
    
    cpf_existente = db.query(Usuario).filter(Usuario.cpf == usuario.cpf).first()
    email_existente = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    
    if cpf_existente:
        raise HTTPException(status_code=400, detail="Este CPF já está cadastrado.")
    if email_existente:
        raise HTTPException(status_code=400, detail="Este Email já está cadastrado.")
        
    senha_criptografada = get_password_hash(usuario.cpf)
    
    # Passo 3: Monta o usuário mesclando os dados do formulário com a senha nova
    # Como precisamos adicionar a senha_hash manualmente, fazemos um mix:
    db_usuario = Usuario(
        **usuario.model_dump(),       # Desempacota nome, email, cpf, etc.
        senha_hash=senha_criptografada # Injeta a senha criptografada que o app não enviou
    )
    
    # Passo 4: Salva no banco
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    
    return db_usuario