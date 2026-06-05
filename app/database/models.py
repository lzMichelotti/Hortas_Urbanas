from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, ForeignKey, Text, DateTime,
    CheckConstraint, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from app.database.session import Base
from app.database.enums import (
    FonteAgua, TipoSolo, NivelVulnerabilidade, TipoZona, NivelRisco,
    Privilegio, StatusCiclo, StatusIntencao, StatusSolicitacao, StatusDemanda,
    enum_check,
)


class Horta(Base):
    __tablename__ = 'Hortas'
    __table_args__ = (
        enum_check("fonte_agua", FonteAgua, name="ck_hortas_fonte_agua"),
        enum_check("tipo_solo", TipoSolo, name="ck_hortas_tipo_solo"),
        enum_check("nivel_vulnerabilidade", NivelVulnerabilidade,
                   name="ck_hortas_nivel_vulnerabilidade"),
    )

    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False)

    rua = Column(String(255))
    numero = Column(String(50))
    bairro = Column(String(100))
    cep = Column(String(20))
    cidade = Column(String(100))
    uf = Column(String(2))

    localizacao = Column(Geography("POINT", srid=4326), nullable=True)

    area_total = Column(Float)
    publico_atendido = Column(Text)

    # Campos de resiliência climática
    tem_cisterna = Column(Boolean, nullable=True)
    fonte_agua = Column(String(50), nullable=True)
    tipo_solo = Column(String(50), nullable=True)
    area_permeavel = Column(Float, nullable=True)
    nivel_vulnerabilidade = Column(String(20), nullable=True)
    praticas_cultivo = Column(JSONB, nullable=True)

    ativo = Column(Boolean, default=True, nullable=False)
    deletado_em = Column(DateTime(timezone=True), nullable=True)

    usuarios = relationship("Usuario", back_populates="horta")
    canteiros = relationship("Canteiro", back_populates="horta", passive_deletes=True)
    intencoes = relationship("IntencaoPlantio", back_populates="horta", passive_deletes=True)
    demandas = relationship("Demanda", back_populates="horta", passive_deletes=True)


class ZonaRisco(Base):
    __tablename__ = 'Zonas_Risco'
    __table_args__ = (
        enum_check("tipo", TipoZona, name="ck_zonas_risco_tipo"),
        enum_check("nivel", NivelRisco, name="ck_zonas_risco_nivel"),
    )

    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False)
    tipo = Column(String(50), nullable=False)
    nivel = Column(String(20), nullable=False)
    descricao = Column(Text, nullable=True)
    area = Column(Geography("POLYGON", srid=4326), nullable=False)

    ativa = Column(Boolean, nullable=False, server_default="false")
    data_ocorrencia = Column(DateTime(timezone=True), nullable=True)
    data_fim = Column(DateTime(timezone=True), nullable=True)


class Usuario(Base):
    __tablename__ = 'Usuarios'
    __table_args__ = (
        enum_check("privilegio", Privilegio, name="ck_usuarios_privilegio"),
    )

    id = Column(Integer, primary_key=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='SET NULL'), nullable=True, index=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    cpf = Column(String(14), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    telefone = Column(String(20), nullable=False)
    privilegio = Column(String(50), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)      # baixa cardinalidade — sem índice B-tree
    deletado_em = Column(DateTime(timezone=True), nullable=True)

    horta = relationship("Horta", back_populates="usuarios")
    canteiros = relationship("Canteiro", back_populates="usuario")


class Canteiro(Base):
    __tablename__ = 'Canteiros'

    id = Column(Integer, primary_key=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True, index=True)

    identificacao = Column(String(100), nullable=False)
    area_produtiva = Column(Float)
    area_ociosa = Column(Float)

    ativo = Column(Boolean, default=True, nullable=False)
    deletado_em = Column(DateTime(timezone=True), nullable=True)

    horta = relationship("Horta", back_populates="canteiros")
    usuario = relationship("Usuario", back_populates="canteiros")
    ciclos = relationship("CicloProducao", back_populates="canteiro", passive_deletes=True)
    solicitacoes = relationship("SolicitacaoPlantio", back_populates="canteiro", passive_deletes=True)


class Produto(Base):
    __tablename__ = 'Produtos'

    id = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False)
    categoria = Column(String(50))
    da_em_arvore = Column(Boolean)
    necessita_replantio = Column(Boolean)
    epoca_recomendada = Column(String(100))
    inicio_colheita = Column(String(100))
    ativo = Column(Boolean, default=True, nullable=False)      # baixa cardinalidade — sem índice B-tree
    deletado_em = Column(DateTime(timezone=True), nullable=True)

    ciclos = relationship("CicloProducao", back_populates="produto")
    intencoes = relationship("IntencaoPlantio", back_populates="produto")
    solicitacoes = relationship("SolicitacaoPlantio", back_populates="produto")


class CicloProducao(Base):
    __tablename__ = 'Ciclos_Producao'
    __table_args__ = (
        enum_check("status", StatusCiclo, name="ck_ciclos_producao_status"),
        CheckConstraint(
            "previsao_colheita > data_plantio",
            name="ck_ciclos_producao_datas",
        ),
        CheckConstraint(
            "quantidade > 0",
            name="ck_ciclos_producao_quantidade_positiva",
        ),
        # Idempotency-Key escopada por canteiro: a mesma UUID em canteiros
        # diferentes não colide (evita leak entre usuários).
        UniqueConstraint(
            "canteiro_id", "idempotency_key",
            name="uq_ciclos_producao_idempotency",
        ),
    )

    id = Column(Integer, primary_key=True)
    canteiro_id = Column(Integer, ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True, index=True)

    data_plantio = Column(Date)
    previsao_colheita = Column(Date)
    data_colheita_real = Column(Date, nullable=True)
    status = Column(String(50))
    quantidade = Column(Integer, nullable=True)

    ativo = Column(Boolean, default=True, nullable=False)
    deletado_em = Column(DateTime(timezone=True), nullable=True)
    idempotency_key = Column(UUID(as_uuid=True), nullable=True)

    canteiro = relationship("Canteiro", back_populates="ciclos")
    produto = relationship("Produto", back_populates="ciclos")


class IntencaoPlantio(Base):
    __tablename__ = 'Intencoes_Plantio'
    __table_args__ = (
        enum_check("status", StatusIntencao, name="ck_intencoes_plantio_status"),
    )

    id = Column(Integer, primary_key=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True)
    justificativa_comunidade = Column(Text)
    data_desejada_plantio = Column(Date, nullable=True)
    status = Column(String(50))

    horta = relationship("Horta", back_populates="intencoes")
    produto = relationship("Produto", back_populates="intencoes")


class SolicitacaoPlantio(Base):
    __tablename__ = 'Solicitacoes_Plantio'
    __table_args__ = (
        enum_check("status", StatusSolicitacao, name="ck_solicitacoes_plantio_status"),
        UniqueConstraint(
            "canteiro_id", "idempotency_key",
            name="uq_solicitacoes_plantio_idempotency",
        ),
    )

    id = Column(Integer, primary_key=True)
    canteiro_id = Column(Integer, ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True)
    justificativa = Column(Text, nullable=True)
    data_desejada_plantio = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="PENDENTE")
    idempotency_key = Column(UUID(as_uuid=True), nullable=True)

    canteiro = relationship("Canteiro", back_populates="solicitacoes")
    produto = relationship("Produto", back_populates="solicitacoes")


class Demanda(Base):
    __tablename__ = 'Demandas'
    __table_args__ = (
        enum_check("status", StatusDemanda, name="ck_demandas_status"),
        CheckConstraint(
            "quantidade > 0",
            name="ck_demandas_quantidade_positiva",
        ),
    )

    id = Column(Integer, primary_key=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False, index=True)
    tipo_demanda = Column(String(50), nullable=False)
    descricao = Column(Text, nullable=False)
    quantidade = Column(Float, nullable=False)
    unidade_medida = Column(String(20), nullable=False)
    status = Column(String(50))
    ativo = Column(Boolean, default=True, nullable=False)      # baixa cardinalidade — sem índice B-tree
    deletado_em = Column(DateTime(timezone=True), nullable=True)

    horta = relationship("Horta", back_populates="demandas")
