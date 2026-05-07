import jwt
from enum import Enum
from fastapi import Depends, FastAPI, HTTPException, status
from typing import Annotated, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from datetime import date
from auth import router as auth_router, get_password_hash

from database import SessionLocal, Horta, Produto, CicloProducao, IntencaoPlantio, Demanda, Canteiro, Usuario
from auth import get_admin_user, get_lider_user, get_current_user

app = FastAPI()

app.include_router(auth_router)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DBDep = Annotated[Session, Depends(get_db)]


def verificar_horta(lider: Usuario, horta_id: int):
    if lider.privilegio == "LIDER_HORTA" and lider.horta_id != horta_id:
        raise HTTPException(403, "Sem permissão para esta horta.")

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

class StatusDemanda(str, Enum):
    ABERTA = "ABERTA"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    ATENDIDA = "ATENDIDA"
    CANCELADA = "CANCELADA"

class DemandaUpdateStatus(BaseModel):
    status: StatusDemanda # Usa o Enum que você definiu para garantir a validade

class DemandaCreate(BaseModel):
    tipo_demanda: str
    descricao: str
    status: StatusDemanda
    # gt=0: A quantidade deve ser estritamente maior que 0.
    quantidade: float = Field(..., gt=0, description="Quantidade solicitada (não pode ser zero ou negativa)")
    unidade_medida: str = Field(..., description="Ex: kg, unidades, litros")

class CicloCreate(BaseModel):
    # O canteiro_id foi removido daqui pois virá da URL!
    produto_id: int
    data_plantio: date
    previsao_colheita: date
    status: str

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    cpf: str
    telefone: str
    privilegio: str
    horta_id: Optional[int] = None # Nem todo mundo (ex: Admin Supremo) tem uma horta fixa

# Catálogo de Status
class StatusIntencao(str, Enum):
    PLANEJADO = "PLANEJADO"
    AGUARDANDO_SEMENTES = "AGUARDANDO_SEMENTES"
    EM_PLANTIO = "EM_PLANTIO"
    CONCLUIDO = "CONCLUIDO"

class IntencaoCreate(BaseModel):
    produto_id: int
    justificativa_comunidade: Optional[str] = None
    data_desejada_plantio: Optional[date] = None
    status: StatusIntencao # Enum para blindar o status (Aceita somente valores de StatusIntencao acima)

    # Validar que intenções vão ser somente em data futura
    @field_validator('data_desejada_plantio')
    @classmethod
    def check_data_futura(cls, valor_data):
        if valor_data is not None and valor_data < date.today():
            raise ValueError('A data de plantio não pode estar no passado.')
        return valor_data


# Uso de Enum para manter a consistência dos dados da rede.
# Garante que todas as hortas usem os mesmos termos, essencial para estatísticas e logística em cenários críticos.

## ------------------------ GET ------------------------ ##

# NÍVEIS DE ACESSO

# Nível 1 - Público
# Hortas são públicas (não precisa autenticação)
# Ex: GET /hortas

# Nível 2 - Comunidade
# Requer usuário autenticado (get_current_user)
# Produtos, Ciclos, Demandas, Intenções
# Ex: precisa estar logado

# Nível 3 - Diretoria
# Requer líder da horta (get_lider_user)
# Canteiros e Usuários
# + Regra: só pode acessar dados da própria horta (horta_id)

# NÍVEL 1: PÚBLICO (Sem Segurança)
@app.get("/hortas")
def read_hortas(db: DBDep):
    # Aberto para qualquer um ver o mapa de hortas da cidade
    return db.query(Horta).all()

@app.get("/hortas/{id}")
def read_horta_por_id(id: int, db: DBDep):
    return db.query(Horta).filter(Horta.id == id).first()


# NÍVEL 2: COMUNIDADE (Qualquer Logado)
@app.get("/produtos")
def read_produtos(
    db: DBDep, 
    usuario: Annotated[Usuario, Depends(get_current_user)] # Segurança na porta!
):
    return db.query(Produto).all()

@app.get("/produtos/{id}")
def read_produto_por_id(
    id: int, 
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    return db.query(Produto).filter(Produto.id == id).first()

@app.get("/canteiros/{id}/ciclos")
def read_ciclos_do_canteiro(
    id: int, 
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    return db.query(CicloProducao).filter(CicloProducao.canteiro_id == id).all()

@app.get("/demandas")
def read_demandas(
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    return db.query(Demanda).all()

@app.get("/intencoes")
def read_intencoes(
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    return db.query(IntencaoPlantio).all()


# NÍVEL 3: DIRETORIA (Líder ou Admin)
@app.get("/canteiros")
def read_canteiros(
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    if lider.privilegio == "LIDER_HORTA":
        return db.query(Canteiro).filter(Canteiro.horta_id == lider.horta_id).all()
        
    return db.query(Canteiro).all()

@app.get("/usuarios")
def read_users(
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    # O Líder só vê os membros que pertencem à horta dele E que estão ativos
    if lider.privilegio == "LIDER_HORTA":
        return db.query(Usuario).filter(
            Usuario.horta_id == lider.horta_id, 
            Usuario.ativo == True 
        ).all()
        
    return db.query(Usuario).filter(Usuario.ativo == True).all()

# ------------------------- PUT -------------------------- ##

@app.put("/hortas/{id}")
def update_horta(
    id: int,
    horta: HortaCreate,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    db_horta = db.query(Horta).filter(Horta.id == id).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    for key, value in horta.model_dump().items():
        setattr(db_horta, key, value)

    db.commit()
    db.refresh(db_horta)
    return db_horta

@app.put("/canteiros/{id}")
def update_canteiro(
    id: int,
    canteiro: CanteiroCreate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_canteiro = db.query(Canteiro).filter(Canteiro.id == id).first()

    if not db_canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    if lider.privilegio == "LIDER_HORTA" and db_canteiro.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    for key, value in canteiro.model_dump().items():
        setattr(db_canteiro, key, value)

    db.commit()
    db.refresh(db_canteiro)
    return db_canteiro

@app.put("/demandas/{id}")
def update_demanda(
    id: int,
    demanda: DemandaCreate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_demanda = db.query(Demanda).filter(Demanda.id == id).first()

    if not db_demanda:
        raise HTTPException(404, "Demanda não encontrada")

    if lider.privilegio == "LIDER_HORTA" and db_demanda.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    for key, value in demanda.model_dump().items():
        setattr(db_demanda, key, value)

    db.commit()
    db.refresh(db_demanda)
    return db_demanda

@app.put("/intencoes/{id}")
def update_intencao(
    id: int,
    intencao: IntencaoCreate,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_intencao = db.query(IntencaoPlantio).filter(IntencaoPlantio.id == id).first()

    if not db_intencao:
        raise HTTPException(404, "Intenção não encontrada")

    if lider.privilegio == "LIDER_HORTA" and db_intencao.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    for key, value in intencao.model_dump().items():
        setattr(db_intencao, key, value)

    db.commit()
    db.refresh(db_intencao)
    return db_intencao

@app.put("/ciclos/{id}")
def update_ciclo(
    id: int,
    ciclo: CicloCreate,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    db_ciclo = db.query(CicloProducao).filter(CicloProducao.id == id).first()

    if not db_ciclo:
        raise HTTPException(404, "Ciclo não encontrado")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_ciclo.canteiro_id).first()

    if usuario.privilegio == "MEMBRO_CANTEIRO" and canteiro.usuario_id != usuario.id:
        raise HTTPException(403, "Sem permissão")

    for key, value in ciclo.model_dump().items():
        setattr(db_ciclo, key, value)

    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@app.put("/usuarios/{id}")
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

    for key, value in usuario_update.model_dump().items():
        setattr(db_usuario, key, value)

    db.commit()
    db.refresh(db_usuario)
    return db_usuario

## -------------------- PATCH ----------------------- ##

@app.patch("/hortas/{horta_id}/demandas/{demanda_id}/status")
def update_demanda_status(
    horta_id: int, 
    demanda_id: int, 
    update_data: DemandaUpdateStatus, 
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    verificar_horta(lider, horta_id)
    # garante que a demanda pertença à horta informada na URL
    db_demanda = db.query(Demanda).filter(
        Demanda.id == demanda_id, 
        Demanda.horta_id == horta_id
    ).first()

    if not db_demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada nesta horta.")

    # Converte o modelo para dicionário pegando apenas o que foi enviado
    update_dict = update_data.model_dump(exclude_unset=True)
    
    for key, value in update_dict.items():
        setattr(db_demanda, key, value)

    db.commit()
    db.refresh(db_demanda)
    return db_demanda

## -------------------- DELETE ---------------------- ##

@app.delete("/hortas/{id}")
def delete_horta(
    id: int,
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)]
):
    db_horta = db.query(Horta).filter(Horta.id == id).first()

    if not db_horta:
        raise HTTPException(404, "Horta não encontrada")

    db.delete(db_horta)
    db.commit()

    return {"detail": "Horta removida com sucesso"}

@app.delete("/canteiros/{id}")
def delete_canteiro(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_canteiro = db.query(Canteiro).filter(Canteiro.id == id).first()

    if not db_canteiro:
        raise HTTPException(404, "Canteiro não encontrado")

    if lider.privilegio == "LIDER_HORTA" and db_canteiro.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    db.delete(db_canteiro)
    db.commit()

    return {"detail": "Canteiro removido com sucesso"}

@app.delete("/demandas/{id}")
def delete_demanda(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_demanda = db.query(Demanda).filter(Demanda.id == id).first()

    if not db_demanda:
        raise HTTPException(404, "Demanda não encontrada")

    if lider.privilegio == "LIDER_HORTA" and db_demanda.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    db.delete(db_demanda)
    db.commit()

    return {"detail": "Demanda removida com sucesso"}

@app.delete("/intencoes/{id}")
def delete_intencao(
    id: int,
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)]
):
    db_intencao = db.query(IntencaoPlantio).filter(IntencaoPlantio.id == id).first()

    if not db_intencao:
        raise HTTPException(404, "Intenção não encontrada")

    if lider.privilegio == "LIDER_HORTA" and db_intencao.horta_id != lider.horta_id:
        raise HTTPException(403, "Sem permissão")

    db.delete(db_intencao)
    db.commit()

    return {"detail": "Intenção removida com sucesso"}

@app.delete("/ciclos/{id}")
def delete_ciclo(
    id: int,
    db: DBDep,
    usuario: Annotated[Usuario, Depends(get_current_user)]
):
    db_ciclo = db.query(CicloProducao).filter(CicloProducao.id == id).first()

    if not db_ciclo:
        raise HTTPException(404, "Ciclo não encontrado")

    canteiro = db.query(Canteiro).filter(Canteiro.id == db_ciclo.canteiro_id).first()

    if usuario.privilegio == "MEMBRO_CANTEIRO" and canteiro.usuario_id != usuario.id:
        raise HTTPException(403, "Sem permissão")

    db.delete(db_ciclo)
    db.commit()

    return {"detail": "Ciclo removido com sucesso"}

@app.delete("/usuarios/{id}")
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
    db.add(db_usuario)
    db.commit()

    return {"detail": "Usuário removido com sucesso"}

## ------------------------ POST ------------------------ ##

@app.post("/hortas")
def create_horta(
    horta: HortaCreate, 
    db: DBDep,
    admin: Annotated[Usuario, Depends(get_admin_user)] 
):
    db_horta = Horta(**horta.model_dump())
    db.add(db_horta)
    db.commit()
    db.refresh(db_horta)
    return db_horta

@app.post("/hortas/{horta_id}/canteiros")
def create_canteiro(
    horta_id: int, 
    canteiro: CanteiroCreate, 
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)] #Líder ou Admin
):
    # Líder só mexe na própria horta
    verificar_horta(lider, horta_id)

    db_canteiro = Canteiro(**canteiro.model_dump(), horta_id=horta_id)
    db.add(db_canteiro)
    db.commit()
    db.refresh(db_canteiro)
    return db_canteiro

@app.post("/hortas/{horta_id}/demandas")
def create_demanda(
    horta_id: int, 
    demanda: DemandaCreate, 
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)] #Líder
):
    verificar_horta(lider, horta_id)
        
    db_demanda = Demanda(**demanda.model_dump(), horta_id=horta_id)
    db.add(db_demanda)
    db.commit()
    db.refresh(db_demanda)
    return db_demanda

@app.post("/hortas/{horta_id}/intencoes")
def create_intencao(
    horta_id: int, 
    intencao: IntencaoCreate, 
    db: DBDep,
    lider: Annotated[Usuario, Depends(get_lider_user)] # Líder
):
    verificar_horta(lider, horta_id)

    produto_existe = db.query(Produto).filter(Produto.id == intencao.produto_id).first()
    if not produto_existe:
        raise HTTPException(
            status_code=404, 
            detail="O produto selecionado não existe no catálogo oficial."
        )
        
    db_intencao = IntencaoPlantio(**intencao.model_dump(), horta_id=horta_id)
    db.add(db_intencao)
    db.commit()
    db.refresh(db_intencao)
    return db_intencao

@app.post("/canteiros/{canteiro_id}/ciclos")
def create_ciclo(
    canteiro_id: int, 
    ciclo: CicloCreate, 
    db: DBDep,
    membro: Annotated[Usuario, Depends(get_current_user)] # Qualquer logado
):
    # Membro só planta no canteiro dele
    canteiro_banco = db.query(Canteiro).filter(Canteiro.id == canteiro_id).first()
    
    if not canteiro_banco:
        raise HTTPException(status_code=404, detail="Canteiro não encontrado.")
        
    if membro.privilegio == "MEMBRO_CANTEIRO" and canteiro_banco.usuario_id != membro.id:
        raise HTTPException(
            status_code=403, 
            detail="Você só pode registrar plantios no seu próprio canteiro."
        )

    db_ciclo = CicloProducao(**ciclo.model_dump(), canteiro_id=canteiro_id)
    db.add(db_ciclo)
    db.commit()
    db.refresh(db_ciclo)
    return db_ciclo

@app.post("/usuarios")
def create_usuario(
    usuario: UsuarioCreate, 
    db: DBDep,
    usuario_logado: Annotated[Usuario, Depends(get_lider_user)] 
):
        
    if usuario_logado.privilegio == "LIDER_HORTA":  
        usuario.horta_id = usuario_logado.horta_id
        if usuario.privilegio == "ADMIN_SUPREMO":
            raise HTTPException(status_code=403, detail="Líderes não criam Administradores.")
            
    # Validações normais
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