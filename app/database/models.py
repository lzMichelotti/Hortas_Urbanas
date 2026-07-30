from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, ForeignKey, Text, DateTime,
    CheckConstraint, UniqueConstraint, Index, event, func, text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from app.database.session import Base
from app.database.enums import (
    FonteAgua, TipoSolo, NivelVulnerabilidade, TipoZona, NivelRisco,
    Privilegio, StatusCiclo, StatusIntencao, StatusPedido,
    TipoPost, MotivoPerda, enum_check,
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
    avatar = Column(String(30), nullable=False, server_default=text("'jardineira'"))
    ativo = Column(Boolean, default=True, nullable=False)      # baixa cardinalidade — sem índice B-tree
    deletado_em = Column(DateTime(timezone=True), nullable=True)

    horta = relationship("Horta", back_populates="usuarios")
    canteiros = relationship("Canteiro", back_populates="usuario")


class Canteiro(Base):
    __tablename__ = 'Canteiros'
    __table_args__ = (
        CheckConstraint("numero > 0", name="ck_canteiros_numero_positivo"),
        Index(
            "uq_canteiros_horta_numero_ativo",
            "horta_id", "numero",
            unique=True,
            postgresql_where=text("ativo"),
        ),
    )

    id = Column(Integer, primary_key=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True, index=True)

    identificacao = Column(String(100), nullable=False)
    # Número da placa fincada no canteiro; único entre os ativos da horta.
    numero = Column(Integer, nullable=False)
    area_produtiva = Column(Float)
    area_ociosa = Column(Float)

    ativo = Column(Boolean, default=True, nullable=False)
    deletado_em = Column(DateTime(timezone=True), nullable=True)

    horta = relationship("Horta", back_populates="canteiros")
    usuario = relationship("Usuario", back_populates="canteiros")
    ciclos = relationship("CicloProducao", back_populates="canteiro", passive_deletes=True)
    solicitacoes = relationship("SolicitacaoPlantio", back_populates="canteiro", passive_deletes=True)
    demandas = relationship("Demanda", back_populates="canteiro", passive_deletes=True)


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
        enum_check("motivo_perda", MotivoPerda, name="ck_ciclos_producao_motivo_perda"),
        CheckConstraint(
            "previsao_colheita > data_plantio",
            name="ck_ciclos_producao_datas",
        ),
        CheckConstraint(
            "perdido_em >= data_plantio",
            name="ck_ciclos_producao_perdido_em",
        ),
        CheckConstraint(
            "quantidade > 0",
            name="ck_ciclos_producao_quantidade_positiva",
        ),
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

    motivo_perda = Column(String(50), nullable=True)
    observacao_perda = Column(String(140), nullable=True)
    perdido_em = Column(Date, nullable=True)

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
        enum_check("status", StatusPedido, name="ck_solicitacoes_plantio_status"),
        CheckConstraint(
            "quantidade > 0",
            name="ck_solicitacoes_plantio_quantidade_positiva",
        ),
        UniqueConstraint(
            "canteiro_id", "idempotency_key",
            name="uq_solicitacoes_plantio_idempotency",
        ),
    )

    id = Column(Integer, primary_key=True)
    canteiro_id = Column(Integer, ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey('Produtos.id', ondelete='SET NULL'), nullable=True)
    quantidade = Column(Integer, nullable=False, server_default=text("1"))
    justificativa = Column(Text, nullable=True)
    data_desejada_plantio = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="ABERTA")
    idempotency_key = Column(UUID(as_uuid=True), nullable=True)

    canteiro = relationship("Canteiro", back_populates="solicitacoes")
    produto = relationship("Produto", back_populates="solicitacoes")


class Demanda(Base):
    __tablename__ = 'Demandas'
    __table_args__ = (
        enum_check("status", StatusPedido, name="ck_demandas_status"),
        CheckConstraint(
            "quantidade > 0",
            name="ck_demandas_quantidade_positiva",
        ),
        UniqueConstraint(
            "horta_id", "idempotency_key",
            name="uq_demandas_idempotency",
        ),
    )

    id = Column(Integer, primary_key=True)
    horta_id = Column(Integer, ForeignKey('Hortas.id', ondelete='CASCADE'), nullable=False, index=True)
    canteiro_id = Column(Integer, ForeignKey('Canteiros.id', ondelete='CASCADE'), nullable=True, index=True)
    tipo_demanda = Column(String(50), nullable=False)
    descricao = Column(Text, nullable=False)
    quantidade = Column(Float, nullable=False)
    unidade_medida = Column(String(20), nullable=False)
    status = Column(String(50))
    idempotency_key = Column(UUID(as_uuid=True), nullable=True)
    criado_em = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    # nullable: só recebe data ao ser concluída/cancelada — enquanto aberta, não há.
    finalizado_em = Column(DateTime(timezone=True), nullable=True)

    horta = relationship("Horta", back_populates="demandas")
    canteiro = relationship("Canteiro", back_populates="demandas")


_STATUS_PEDIDO_FINAIS = {StatusPedido.ATENDIDA.value, StatusPedido.CANCELADA.value}


@event.listens_for(Demanda.status, "set")
def _carimbar_finalizado_em(demanda, novo_status, _antigo, _iniciador):
    status = getattr(novo_status, "value", novo_status)
    if status in _STATUS_PEDIDO_FINAIS:
        if demanda.finalizado_em is None:
            demanda.finalizado_em = datetime.now(timezone.utc)
    else:
        demanda.finalizado_em = None


class Post(Base):
    __tablename__ = 'Posts'
    __table_args__ = (
        enum_check("tipo", TipoPost, name="ck_posts_tipo"),
        Index("ix_Posts_tipo_id", "tipo", "id"),
    )

    id = Column(Integer, primary_key=True)
    autor_id = Column(Integer, ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    tipo = Column(String(20), nullable=False, server_default="AJUDA")
    conteudo = Column(Text, nullable=False)
    criado_em = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    autor = relationship("Usuario")
    respostas = relationship(
        "Resposta", back_populates="post",
        cascade="all, delete", passive_deletes=True, order_by="Resposta.id",
    )
    imagens = relationship(
        "PostImagem", back_populates="post",
        cascade="all, delete", passive_deletes=True, order_by="PostImagem.id",
    )


class PostImagem(Base):
    __tablename__ = 'Post_Imagens'

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey('Posts.id', ondelete='CASCADE'), nullable=False, index=True)
    object_key = Column(String(500), nullable=False, unique=True)
    content_type = Column(String(40), nullable=False)
    criado_em = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    post = relationship("Post", back_populates="imagens")


class Resposta(Base):
    __tablename__ = 'Respostas'

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey('Posts.id', ondelete='CASCADE'), nullable=False, index=True)
    autor_id = Column(Integer, ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True, index=True)
    conteudo = Column(Text, nullable=False)
    criado_em = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    post = relationship("Post", back_populates="respostas")
    autor = relationship("Usuario")


class Curtida(Base):
    __tablename__ = 'Curtidas'
    __table_args__ = (
        UniqueConstraint("post_id", "usuario_id", name="uq_curtidas_post_usuario"),
    )

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey('Posts.id', ondelete='CASCADE'), nullable=False)
    usuario_id = Column(Integer, ForeignKey('Usuarios.id', ondelete='CASCADE'), nullable=False)
    criado_em = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Denuncia(Base):
    __tablename__ = 'Denuncias'
    __table_args__ = (
        CheckConstraint("num_nonnulls(post_id, resposta_id) = 1", name="ck_denuncias_alvo_unico"),
    )

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey('Posts.id', ondelete='CASCADE'), nullable=True, index=True)
    resposta_id = Column(Integer, ForeignKey('Respostas.id', ondelete='CASCADE'), nullable=True, index=True)
    denunciante_id = Column(Integer, ForeignKey('Usuarios.id', ondelete='SET NULL'), nullable=True)
    motivo = Column(String(280), nullable=True)
    criado_em = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
