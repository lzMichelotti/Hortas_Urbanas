from fastapi import Depends, FastAPI
from typing import Annotated, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date

from database import SessionLocal, Horta, Produto, CicloProducao, IntencaoPlantio, Demanda, Canteiro

app = FastAPI()

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

class CicloCreate(BaseModel):
    canteiro_id: int # Mudou! Agora plantamos no canteiro
    produto_id: int
    data_plantio: date
    previsao_colheita: date
    status: str

## ------------------------ GET ------------------------ ##

@app.get("/hortas")
def read_hortas(db: DBDep):
    return db.query(Horta).all()

@app.get("/produtos")
def read_produtos(db: DBDep):
    return db.query(Produto).all()

@app.get("/produtos/{id}")
def read_produto_por_id(id: int, db: DBDep):
    return db.query(Produto).filter(Produto.id == id).first()

@app.get("/hortas/{id}")
def read_horta_por_id(id: int, db: DBDep):
    return db.query(Horta).filter(Horta.id == id).first()

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

@app.post("/ciclos")
def create_ciclo(ciclo: CicloCreate, db: DBDep):
    db_ciclo = CicloProducao(**ciclo.model_dump())
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo