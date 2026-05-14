from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Text, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database.session import Base


class Horta(Base):
    __tablename__ = 'Hortas'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    
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
    canteiros = relationship("Canteiro", back_populates="horta", cascade="all, delete", passive_deletes=True)
    intencoes = relationship("IntencaoPlantio", back_populates="horta", cascade="all, delete", passive_deletes=True)
    demandas = relationship("Demanda", back_populates="horta", cascade="all, delete", passive_deletes=True)

class Usuario(Base):
    __tablename__ = 'Usuarios'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='SET NULL'), nullable=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    cpf = Column(String(14), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    telefone = Column(String(20), nullable=False) 
    privilegio = Column(String(50), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    deletado_em = Column(DateTime, nullable=True)

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

    horta = relationship("Horta", back_populates="canteiros")
    usuario = relationship("Usuario", back_populates="canteiros")
    ciclos = relationship("CicloProducao", back_populates="canteiro", cascade="all, delete", passive_deletes=True)
    solicitacoes = relationship("SolicitacaoPlantio", back_populates="canteiro", cascade="all, delete", passive_deletes=True)

class Produto(Base):
    __tablename__ = 'Produtos'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    categoria = Column(String(50))
    da_em_arvore = Column(Boolean)
    necessita_replantio = Column(Boolean)
    epoca_recomendada = Column(String(100))
    inicio_colheita = Column(String(100))

    ciclos = relationship("CicloProducao", back_populates="produto")
    intencoes = relationship("IntencaoPlantio", back_populates="produto")
    solicitacoes = relationship("SolicitacaoPlantio", back_populates="produto")

class CicloProducao(Base):
    __tablename__ = 'Ciclos_Producao'
    
    id = Column(Integer, primary_key=True, index=True)
    canteiro_id = Column(Integer, ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=False) 
    produto_id = Column(Integer, ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True)
    
    data_plantio = Column(Date)
    previsao_colheita = Column(Date)
    data_colheita_real = Column(Date, nullable=True)
    status = Column(String(50))

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

class SolicitacaoPlantio(Base):
    __tablename__ = 'Solicitacoes_Plantio'

    id = Column(Integer, primary_key=True, index=True)
    canteiro_id = Column(Integer, ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=False)
    produto_id = Column(Integer, ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True)
    justificativa = Column(Text, nullable=True)
    data_desejada_plantio = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="PENDENTE")

    canteiro = relationship("Canteiro", back_populates="solicitacoes")
    produto = relationship("Produto", back_populates="solicitacoes")


class Demanda(Base):
    __tablename__ = 'Demandas'
    
    id = Column(Integer, primary_key=True, index=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False)
    tipo_demanda = Column(String(50), nullable=False)
    descricao = Column(Text, nullable=False)
    quantidade = Column(Float, nullable=False)
    unidade_medida = Column(String(20), nullable=False)
    status = Column(String(50))
    ativo = Column(Boolean, default=True, nullable=False)
    deletado_em = Column(DateTime, nullable=True)

    horta = relationship("Horta", back_populates="demandas")


