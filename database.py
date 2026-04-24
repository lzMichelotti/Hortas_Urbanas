from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Date, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from pydantic import BaseModel

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

    usuarios = relationship("Usuario", back_populates="horta")
    canteiros = relationship("Canteiro", back_populates="horta") 
    intencoes = relationship("IntencaoPlantio", back_populates="horta")
    demandas = relationship("Demanda", back_populates="horta")

class Canteiro(Base):
    __tablename__ = 'Canteiros'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id'), nullable=False)
    usuario_id = Column(Integer, ForeignKey('Usuarios.id'), nullable=True) # Dono do canteiro
    
    identificacao = Column(String(100), nullable=False) # Ex: "Canteiro 01", "Canteiro da Esquina"
    area_produtiva = Column(Float)
    area_ociosa = Column(Float)

    # Relacionamentos
    horta = relationship("Horta", back_populates="canteiros")
    usuario = relationship("Usuario", back_populates="canteiros")
    ciclos = relationship("CicloProducao", back_populates="canteiro")

class Produto(Base):
    __tablename__ = 'Produtos'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    categoria = Column(String(50))
    da_em_arvore = Column(Boolean)
    necessita_replantio = Column(Boolean)

    ciclos = relationship("CicloProducao", back_populates="produto")
    intencoes = relationship("IntencaoPlantio", back_populates="produto")

class CicloProducao(Base):
    __tablename__ = 'Ciclos_Producao'
    
    id = Column(Integer, primary_key=True, index=True)
    canteiro_id = Column(Integer, ForeignKey('Canteiros.id'), nullable=False) 
    produto_id = Column(Integer, ForeignKey('Produtos.id'), nullable=False)
    
    data_plantio = Column(Date)
    previsao_colheita = Column(Date)
    data_colheita_real = Column(Date, nullable=True)
    status = Column(String(50))

    # Relacionamentos
    canteiro = relationship("Canteiro", back_populates="ciclos")
    produto = relationship("Produto", back_populates="ciclos")

class Usuario(Base):
    __tablename__ = 'Usuarios'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id'), nullable=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False) 
    cpf = Column(String(14), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    telefone = Column(String(20), nullable=False) 
    privilegio = Column(String(50), nullable=False) # ADMIN_SUPREMO, LIDER_HORTA, MEMBRO_CANTEIRO

    # Relacionamentos
    horta = relationship("Horta", back_populates="usuarios")
    canteiros = relationship("Canteiro", back_populates="usuario") # Quais canteiros ele cuida

class IntencaoPlantio(Base):
    __tablename__ = 'Intencoes_Plantio'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id'), nullable=False)
    produto_id = Column(Integer, ForeignKey('Produtos.id'), nullable=False)
    justificativa_comunidade = Column(Text)
    data_desejada_plantio = Column(Date, nullable=True)
    status = Column(String(50))

    horta = relationship("Horta", back_populates="intencoes")
    produto = relationship("Produto", back_populates="intencoes")

class Demanda(Base):
    __tablename__ = 'Demandas'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id'), nullable=False)
    tipo_demanda = Column(String(50), nullable=False)
    descricao = Column(Text, nullable=False)
    status = Column(String(50))

    horta = relationship("Horta", back_populates="demandas")


Base.metadata.create_all(bind=engine)
print("Novas tabelas (Hortas, Canteiros, etc) criadas com sucesso no PostgreSQL")