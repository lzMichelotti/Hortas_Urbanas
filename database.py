from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session

DATABASE_URL = "postgresql://horta:horta1234@127.0.0.1:5435/horta_db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Horta(Base):
    __tablename__ = 'Hortas'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    
    # Endereço (Novos campos do PDF)
    rua = Column(String(255))
    numero = Column(String(50))
    bairro = Column(String(100))
    cep = Column(String(20))
    cidade = Column(String(100))
    uf = Column(String(2))
    
    latitude = Column(Float)
    longitude = Column(Float)
    
    area_total = Column(Float)
    publico_atendido = Column(Text)

    # Relacionamentos com cascata
    # CASCADE: usuários é crítico para a horta, mas usaremos soft_delete ao invés
    usuarios = relationship("Usuario", back_populates="horta")
    # CASCADE: canteiros pertencem EXCLUSIVAMENTE a uma horta, deletar faz sentido
    canteiros = relationship("Canteiro", back_populates="horta", cascade="all, delete", passive_deletes=True)
    # CASCADE: intenções são planejamento, vinculadas à horta
    intencoes = relationship("IntencaoPlantio", back_populates="horta", cascade="all, delete", passive_deletes=True)
    # CASCADE: demandas são críticas para auditoria, usar soft_delete ao invés
    demandas = relationship("Demanda", back_populates="horta", cascade="all, delete", passive_deletes=True)

class Usuario(Base):
    __tablename__ = 'Usuarios'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='SET NULL'), nullable=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False) 
    cpf = Column(String(14), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    telefone = Column(String(20), nullable=False) 
    privilegio = Column(String(50), nullable=False) # ADMIN_SUPREMO, LIDER_HORTA, MEMBRO_CANTEIRO
    # Soft delete: usuário removido mas histórico preservado
    ativo = Column(Boolean, default=True, nullable=False)
    deletado_em = Column(DateTime, nullable=True)

    # Relacionamentos
    horta = relationship("Horta", back_populates="usuarios")
    canteiros = relationship("Canteiro", back_populates="usuario")

class Canteiro(Base):
    __tablename__ = 'Canteiros'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False)
    usuario_id = Column(Integer, ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True)
    
    identificacao = Column(String(100), nullable=False)
    area_produtiva = Column(Float)
    area_ociosa = Column(Float)

    # Relacionamentos
    horta = relationship("Horta", back_populates="canteiros")
    usuario = relationship("Usuario", back_populates="canteiros")
    # CASCADE: ciclos pertencem ao canteiro, sem canteiro = sem ciclos
    ciclos = relationship("CicloProducao", back_populates="canteiro", cascade="all, delete", passive_deletes=True)

class Produto(Base):
    __tablename__ = 'Produtos'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    categoria = Column(String(50))
    da_em_arvore = Column(Boolean)
    necessita_replantio = Column(Boolean)
    epoca_recomendada = Column(String(100))
    inicio_colheita = Column(String(100))

    # SET NULL: remover produto mas manter histórico de ciclos
    ciclos = relationship("CicloProducao", back_populates="produto")
    # SET NULL: remover produto mas manter intenções (planejamento histórico)
    intencoes = relationship("IntencaoPlantio", back_populates="produto")

class CicloProducao(Base):
    __tablename__ = 'Ciclos_Producao'
    
    id = Column(Integer, primary_key=True, index=True)
    canteiro_id = Column(Integer, ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=False) 
    produto_id = Column(Integer, ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True)
    
    data_plantio = Column(Date)
    previsao_colheita = Column(Date)
    data_colheita_real = Column(Date, nullable=True)
    status = Column(String(50))

    # Relacionamentos
    canteiro = relationship("Canteiro", back_populates="ciclos")
    produto = relationship("Produto", back_populates="ciclos")

class IntencaoPlantio(Base):
    __tablename__ = 'Intencoes_Plantio'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False)
    produto_id = Column(Integer, ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True)
    justificativa_comunidade = Column(Text)
    data_desejada_plantio = Column(Date, nullable=True)
    status = Column(String(50))

    horta = relationship("Horta", back_populates="intencoes")
    produto = relationship("Produto", back_populates="intencoes")

class Demanda(Base):
    __tablename__ = 'Demandas'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False)
    tipo_demanda = Column(String(50), nullable=False)
    descricao = Column(Text, nullable=False)
    status = Column(String(50))
    # Soft delete: demandas devem ser auditadas, não deletadas fisicamente
    ativo = Column(Boolean, default=True, nullable=False)
    deletado_em = Column(DateTime, nullable=True)

    horta = relationship("Horta", back_populates="demandas")


Base.metadata.create_all(bind=engine)
print("Tabelas criadas com sucesso no PostgreSQL")

# ============ SOFT DELETE HELPERS ============ 
# Use estes helpers para "deletar" registros que devem manter auditoria

def soft_delete_usuario(db: Session, usuario_id: int):
    """Marca usuário como deletado sem remover do banco"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if usuario:
        usuario.ativo = False
        usuario.deletado_em = datetime.now()
        db.commit()

def soft_delete_demanda(db: Session, demanda_id: int):
    """Marca demanda como deletada sem remover do banco"""
    demanda = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if demanda:
        demanda.ativo = False
        demanda.deletado_em = datetime.now()
        db.commit()

# ============ ESTRATÉGIA DE CASCATA ============
# CASCADE: Horta → Canteiros, Intenções, Demandas
#   Motivo: entidades filhas perderm contexto sem pai
#
# SET NULL: Usuario em Canteiro, Produto em Ciclo/Intenção
#   Motivo: preservar histórico (quem plantou? qual produto?)
#
# SOFT DELETE: Usuario, Demanda
#   Motivo: auditoria, rastreabilidade, compliancef