"""Leituras agregadas do painel da administração — só leitura, tudo somado no banco."""
from datetime import date, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session

from app.core.config import hoje
from app.core.http import aplica_etag
from app.database.enums import MOTIVOS_CLIMATICOS, Privilegio, RacaCor, Sexo
from app.database.models import (
    Canteiro, CicloProducao, Demanda, Horta, Produto, SolicitacaoPlantio, Usuario,
)
from app.database.session import get_db
from app.dependencies import get_admin_user
from app.routers.canteiros import TOLERANCIA_ATRASO_DIAS
from app.routers.demandas import abertos_e_historico, atraso_do_pedido
from app.routers.hortas import _indice_biodiversidade, _to_publica
from app.schemas.painel_admin import (
    Fatia, FichaHorta, LiderResumo, Panorama, PedidoAdmin, PerdaPorMotivo, PerfilHorticultores,
    PontoSerie, Producao, ProducaoHorta, ProdutoNoPeriodo,
    ResumoCanteiros, ResumoDemandas, ResumoHortas, ResumoPessoas, ResumoProducao,
)

# No router, e não em cada rota: endpoint novo nasce restrito ao admin.
router = APIRouter(
    prefix="/painel/admin",
    tags=["Painel Admin"],
    dependencies=[Depends(get_admin_user)],
)

DBDep = Annotated[Session, Depends(get_db)]

DIAS_PADRAO = 90
DIAS_SEM_PLANTIO = 60
PERIODO_MAXIMO_DIAS = 1096          # ~3 anos: além disso a série mensal incha o payload
TOP_PRODUTOS = 10
LIMIAR_SUPRESSAO = 5

_MOTIVOS_CLIMATICOS = tuple(m.value for m in MOTIVOS_CLIMATICOS)
_MOTIVO_NAO_INFORMADO = "NAO_INFORMADO"
_PRIVILEGIOS_HORTICULTOR = (Privilegio.MEMBRO_CANTEIRO.value, Privilegio.LIDER_HORTA.value)

_FAIXAS_ETARIAS = ["ATE_29", "30_44", "45_59", "60_MAIS"]


def _escopo_ciclos(query):
    """Ciclos vivos, de canteiros vivos, de hortas vivas — senão o que foi removido
    continua pesando no total."""
    return (
        query
        .join(Canteiro, CicloProducao.canteiro_id == Canteiro.id)
        .join(Horta, Horta.id == Canteiro.horta_id)
        .filter(
            CicloProducao.ativo == True,
            Canteiro.ativo == True,
            Horta.ativo == True,
        )
    )


def _colunas_producao(desde: date, ate: date):
    """Doc do FILTER: postgresql.org/docs/15/sql-expressions.html#SYNTAX-AGGREGATES"""
    plantios = func.count().filter(CicloProducao.data_plantio.between(desde, ate))
    colheitas = func.count().filter(
        CicloProducao.status == "COLHIDO",
        CicloProducao.data_colheita_real.between(desde, ate),
    )
    perdidos = and_(
        CicloProducao.status == "PERDIDO",
        CicloProducao.perdido_em.between(desde, ate),
    )
    perdas = func.count().filter(perdidos)
    perdas_climaticas = func.count().filter(
        perdidos, CicloProducao.motivo_perda.in_(_MOTIVOS_CLIMATICOS)
    )
    return plantios, colheitas, perdas, perdas_climaticas


def _resumo_canteiros(db: Session, horta_id: Optional[int] = None) -> ResumoCanteiros:
    query = (
        db.query(
            func.count(Canteiro.id),
            func.count().filter(Canteiro.usuario_id.isnot(None)),
            func.coalesce(func.sum(Canteiro.area_produtiva), 0.0),
            func.coalesce(func.sum(Canteiro.area_ociosa), 0.0),
        )
        .join(Horta, Horta.id == Canteiro.horta_id)
        .filter(Canteiro.ativo == True, Horta.ativo == True)
    )
    if horta_id is not None:
        query = query.filter(Canteiro.horta_id == horta_id)

    ativos, com_responsavel, area_produtiva, area_ociosa = query.one()
    return ResumoCanteiros(
        ativos=ativos,
        com_responsavel=com_responsavel,
        ociosos=ativos - com_responsavel,
        area_produtiva_m2=float(area_produtiva),
        area_ociosa_m2=float(area_ociosa),
    )


def _resumo_producao(db: Session, desde: date, ate: date, horta_id: Optional[int] = None) -> ResumoProducao:
    query = _escopo_ciclos(db.query(*_colunas_producao(desde, ate)))
    if horta_id is not None:
        query = query.filter(Canteiro.horta_id == horta_id)

    plantios, colheitas, perdas, climaticas = query.one()
    return ResumoProducao(
        plantios=plantios, colheitas=colheitas,
        perdas=perdas, perdas_climaticas=climaticas,
    )


def _periodo(desde: Optional[date], ate: Optional[date]) -> tuple[date, date]:
    ate = ate or hoje()
    desde = desde or ate - timedelta(days=DIAS_PADRAO)
    if desde > ate:
        raise HTTPException(422, "A data inicial não pode ser depois da data final.")
    if (ate - desde).days > PERIODO_MAXIMO_DIAS:
        raise HTTPException(422, "Escolha um período de no máximo 3 anos.")
    return desde, ate


@router.get("/panorama", response_model=Panorama)
def panorama(request: Request, db: DBDep):
    hoje_local = hoje()
    desde = hoje_local - timedelta(days=DIAS_PADRAO)

    hortas_ativas = db.query(func.count(Horta.id)).filter(Horta.ativo == True).scalar() or 0
    com_lider = (
        db.query(func.count(func.distinct(Horta.id)))
        .join(Usuario, and_(
            Usuario.horta_id == Horta.id,
            Usuario.privilegio == Privilegio.LIDER_HORTA.value,
            Usuario.ativo == True,
        ))
        .filter(Horta.ativo == True)
        .scalar() or 0
    )

    # LEFT JOIN abaixo mantém a horta que nunca plantou, que é a que mais precisa aparecer.
    ultimo_plantio = (
        db.query(
            Canteiro.horta_id.label("horta_id"),
            func.max(CicloProducao.data_plantio).label("ultimo"),
        )
        .join(CicloProducao, and_(
            CicloProducao.canteiro_id == Canteiro.id,
            CicloProducao.ativo == True,
        ))
        .filter(Canteiro.ativo == True)
        .group_by(Canteiro.horta_id)
        .subquery()
    )
    corte_parada = hoje_local - timedelta(days=DIAS_SEM_PLANTIO)
    paradas = (
        db.query(func.count(Horta.id))
        .outerjoin(ultimo_plantio, ultimo_plantio.c.horta_id == Horta.id)
        .filter(
            Horta.ativo == True,
            or_(ultimo_plantio.c.ultimo.is_(None), ultimo_plantio.c.ultimo < corte_parada),
        )
        .scalar() or 0
    )

    membros, lideres = (
        db.query(
            func.count().filter(Usuario.privilegio == Privilegio.MEMBRO_CANTEIRO.value),
            func.count().filter(Usuario.privilegio == Privilegio.LIDER_HORTA.value),
        )
        .filter(Usuario.ativo == True)
        .one()
    )

    abertas, em_atendimento = (
        db.query(
            func.count().filter(Demanda.status == "ABERTA"),
            func.count().filter(Demanda.status == "EM_ATENDIMENTO"),
        )
        .join(Horta, Horta.id == Demanda.horta_id)
        .filter(Horta.ativo == True)
        .one()
    )

    plantas_abertas, plantas_em_atendimento = (
        db.query(
            func.count().filter(SolicitacaoPlantio.status == "ABERTA"),
            func.count().filter(SolicitacaoPlantio.status == "EM_ATENDIMENTO"),
        )
        .join(Canteiro, Canteiro.id == SolicitacaoPlantio.canteiro_id)
        .join(Horta, Horta.id == Canteiro.horta_id)
        .filter(Canteiro.ativo == True, Horta.ativo == True)
        .one()
    )

    payload = Panorama(
        dias=DIAS_PADRAO,
        dias_sem_plantio=DIAS_SEM_PLANTIO,
        hortas=ResumoHortas(
            ativas=hortas_ativas,
            sem_lider=hortas_ativas - com_lider,
            paradas=paradas,
        ),
        canteiros=_resumo_canteiros(db),
        pessoas=ResumoPessoas(membros=membros, lideres=lideres),
        producao=_resumo_producao(db, desde, hoje_local),
        demandas=ResumoDemandas(
            abertas=abertas + plantas_abertas,
            em_atendimento=em_atendimento + plantas_em_atendimento,
        ),
    )
    return aplica_etag(request, payload, cache_control="private, max-age=60")


@router.get("/pedidos", response_model=list[PedidoAdmin])
def pedidos(request: Request, db: DBDep):
    """Todos os pedidos de todas as hortas, já com quem pediu e o atraso calculado:
    uma ida ao servidor monta a tela inteira, sem baixar a lista de usuários."""
    plantas = abertos_e_historico(
        db.query(SolicitacaoPlantio, Canteiro, Usuario.nome)
        .join(Canteiro, Canteiro.id == SolicitacaoPlantio.canteiro_id)
        .join(Horta, Horta.id == Canteiro.horta_id)
        .outerjoin(Usuario, Usuario.id == Canteiro.usuario_id)
        .filter(Canteiro.ativo == True, Horta.ativo == True),
        SolicitacaoPlantio.status, SolicitacaoPlantio.id,
    )
    materiais = abertos_e_historico(
        db.query(Demanda, Canteiro, Usuario.nome)
        .join(Horta, Horta.id == Demanda.horta_id)
        .outerjoin(Canteiro, Canteiro.id == Demanda.canteiro_id)
        .outerjoin(Usuario, Usuario.id == Canteiro.usuario_id)
        .filter(Horta.ativo == True),
        Demanda.status, Demanda.id,
    )

    def comum(pedido, canteiro, nome):
        return dict(
            id=pedido.id,
            canteiro_numero=canteiro.numero if canteiro else None,
            solicitante=nome,
            status=pedido.status,
            criado_em=pedido.criado_em,
            previsao_entrega=pedido.previsao_entrega,
            encaminhada=pedido.encaminhada_em is not None,
            atraso=atraso_do_pedido(pedido),
        )

    payload = [
        PedidoAdmin(
            tipo="PLANTA", horta_id=c.horta_id, produto_id=s.produto_id,
            quantidade=s.quantidade, observacao=s.justificativa, **comum(s, c, nome),
        )
        for s, c, nome in plantas
    ] + [
        PedidoAdmin(
            tipo="MATERIAL", horta_id=d.horta_id, descricao=d.descricao,
            quantidade=d.quantidade, unidade=d.unidade_medida, **comum(d, c, nome),
        )
        for d, c, nome in materiais
    ]
    return aplica_etag(request, payload, cache_control="private, no-cache")


def _serie_de(db: Session, coluna_data, desde: date, ate: date, *filtros) -> dict[str, int]:
    # date_trunc converte `date` para timestamp sozinho — sem cast explícito.
    # Doc: postgresql.org/docs/15/functions-datetime.html
    mes = func.date_trunc("month", coluna_data).label("mes")
    linhas = (
        _escopo_ciclos(db.query(mes, func.count()))
        .filter(coluna_data.between(desde, ate), *filtros)
        .group_by(mes)
        .all()
    )
    return {m.strftime("%Y-%m"): total for m, total in linhas}


@router.get("/producao", response_model=Producao)
def producao(
    request: Request,
    db: DBDep,
    desde: Annotated[Optional[date], Query(description="Início do período (AAAA-MM-DD)")] = None,
    ate: Annotated[Optional[date], Query(description="Fim do período (AAAA-MM-DD)")] = None,
):
    desde, ate = _periodo(desde, ate)

    plantios = _serie_de(db, CicloProducao.data_plantio, desde, ate)
    colheitas = _serie_de(
        db, CicloProducao.data_colheita_real, desde, ate, CicloProducao.status == "COLHIDO"
    )
    perdas = _serie_de(
        db, CicloProducao.perdido_em, desde, ate, CicloProducao.status == "PERDIDO"
    )
    meses = sorted(set(plantios) | set(colheitas) | set(perdas))
    serie = [
        PontoSerie(
            mes=m,
            plantios=plantios.get(m, 0),
            colheitas=colheitas.get(m, 0),
            perdas=perdas.get(m, 0),
        )
        for m in meses
    ]

    col_plantios, col_colheitas, col_perdas, _ = _colunas_producao(desde, ate)
    atrasados = func.count().filter(
        CicloProducao.status.notin_(("COLHIDO", "PERDIDO")),
        CicloProducao.previsao_colheita < hoje() - timedelta(days=TOLERANCIA_ATRASO_DIAS),
    )
    linhas = (
        _escopo_ciclos(
            db.query(Horta.id, Horta.nome, col_plantios, col_colheitas, col_perdas, atrasados)
        )
        .group_by(Horta.id, Horta.nome)
        .order_by(Horta.nome)
        .all()
    )
    por_horta = [
        ProducaoHorta(
            horta_id=hid, nome=nome, plantios=p, colheitas=c, perdas=pe, atrasados=at
        )
        for hid, nome, p, c, pe, at in linhas
    ]

    linhas = (
        _escopo_ciclos(db.query(CicloProducao.motivo_perda, func.count()))
        .filter(
            CicloProducao.status == "PERDIDO",
            CicloProducao.perdido_em.between(desde, ate),
        )
        .group_by(CicloProducao.motivo_perda)
        .all()
    )
    perdas_por_motivo = sorted(
        (
            PerdaPorMotivo(
                motivo=motivo or _MOTIVO_NAO_INFORMADO,
                climatico=motivo in _MOTIVOS_CLIMATICOS,
                total=total,
            )
            for motivo, total in linhas
        ),
        key=lambda p: p.total,
        reverse=True,
    )

    linhas = (
        _escopo_ciclos(db.query(Produto.id, Produto.nome, col_plantios, col_perdas))
        .join(Produto, Produto.id == CicloProducao.produto_id)
        .group_by(Produto.id, Produto.nome)
        .order_by(col_plantios.desc())
        .limit(TOP_PRODUTOS)
        .all()
    )
    produtos = [
        ProdutoNoPeriodo(produto_id=pid, nome=nome, plantios=p, perdas=pe)
        for pid, nome, p, pe in linhas
    ]

    payload = Producao(
        desde=desde, ate=ate,
        serie_mensal=serie,
        por_horta=por_horta,
        perdas_por_motivo=perdas_por_motivo,
        produtos=produtos,
    )
    return aplica_etag(request, payload, cache_control="private, max-age=300")


@router.get("/hortas/{id}", response_model=FichaHorta)
def ficha_horta(id: int, request: Request, db: DBDep):
    horta = db.query(Horta).filter(Horta.id == id, Horta.ativo == True).first()
    if not horta:
        raise HTTPException(404, "Horta não encontrada")

    hoje_local = hoje()
    desde = hoje_local - timedelta(days=DIAS_PADRAO)

    lider = (
        db.query(Usuario)
        .filter(
            Usuario.horta_id == id,
            Usuario.privilegio == Privilegio.LIDER_HORTA.value,
            Usuario.ativo == True,
        )
        .first()
    )
    membros = (
        db.query(func.count(Usuario.id))
        .filter(
            Usuario.horta_id == id,
            Usuario.privilegio == Privilegio.MEMBRO_CANTEIRO.value,
            Usuario.ativo == True,
        )
        .scalar() or 0
    )

    ultimo_plantio, ultima_colheita = (
        _escopo_ciclos(
            db.query(
                func.max(CicloProducao.data_plantio),
                func.max(CicloProducao.data_colheita_real),
            )
        )
        .filter(Canteiro.horta_id == id)
        .one()
    )
    datas = [d for d in (ultimo_plantio, ultima_colheita) if d is not None]

    payload = FichaHorta(
        dias=DIAS_PADRAO,
        horta=_to_publica(horta, _indice_biodiversidade(db, horta.id)),
        lider=LiderResumo(
            id=lider.id, nome=lider.nome, email=lider.email, telefone=lider.telefone
        ) if lider else None,
        membros=membros,
        canteiros=_resumo_canteiros(db, horta_id=id),
        producao=_resumo_producao(db, desde, hoje_local, horta_id=id),
        ultima_atividade=max(datas) if datas else None,
    )
    return aplica_etag(request, payload, cache_control="private, max-age=60")


def _suprimir(contagens: dict[str, int], categorias: list[str]) -> list[Fatia]:
    """Esconde categoria com pouca gente: com ~10 hortas, "1 pessoa indígena" é
    identificação, não estatística (LGPD Art. 5º II — raça/cor é dado sensível).

    Se sobrar uma única categoria escondida, a menor das visíveis vai junto —
    senão bastaria subtrair as outras do total para redescobrir o valor oculto."""
    esconder = {c for c in categorias if 0 < contagens.get(c, 0) < LIMIAR_SUPRESSAO}
    if len(esconder) == 1:
        visiveis = [c for c in categorias if c not in esconder and contagens.get(c, 0) > 0]
        if visiveis:
            esconder.add(min(visiveis, key=lambda c: contagens[c]))

    return [
        Fatia(rotulo=c, n=None, suprimido=True) if c in esconder
        else Fatia(rotulo=c, n=contagens.get(c, 0))
        for c in categorias
    ]


@router.get("/horticultores", response_model=PerfilHorticultores)
def horticultores(db: DBDep):
    base = db.query(Usuario).filter(
        Usuario.ativo == True,
        Usuario.privilegio.in_(_PRIVILEGIOS_HORTICULTOR),
    )

    total = base.with_entities(func.count(Usuario.id)).scalar() or 0
    informaram = (
        base.with_entities(func.count(Usuario.id))
        .filter(or_(
            Usuario.nascimento_ano.isnot(None),
            Usuario.sexo.isnot(None),
            Usuario.raca_cor.isnot(None),
            Usuario.grupo_familiar.isnot(None),
        ))
        .scalar() or 0
    )

    idade = hoje().year - Usuario.nascimento_ano
    faixa = case(
        (idade < 30, "ATE_29"),
        (idade < 45, "30_44"),
        (idade < 60, "45_59"),
        else_="60_MAIS",
    ).label("faixa")
    por_faixa = dict(
        base.with_entities(faixa, func.count())
        .filter(Usuario.nascimento_ano.isnot(None))
        .group_by(faixa)
        .all()
    )

    por_sexo = dict(
        base.with_entities(Usuario.sexo, func.count())
        .filter(Usuario.sexo.isnot(None))
        .group_by(Usuario.sexo)
        .all()
    )
    por_raca = dict(
        base.with_entities(Usuario.raca_cor, func.count())
        .filter(Usuario.raca_cor.isnot(None))
        .group_by(Usuario.raca_cor)
        .all()
    )

    media, soma = (
        base.with_entities(
            func.avg(Usuario.grupo_familiar), func.coalesce(func.sum(Usuario.grupo_familiar), 0)
        )
        .filter(Usuario.grupo_familiar.isnot(None))
        .one()
    )

    return PerfilHorticultores(
        total=total,
        informaram=informaram,
        limiar_supressao=LIMIAR_SUPRESSAO,
        faixa_etaria=_suprimir(por_faixa, _FAIXAS_ETARIAS),
        sexo=_suprimir(por_sexo, [s.value for s in Sexo]),
        raca_cor=_suprimir(por_raca, [r.value for r in RacaCor]),
        grupo_familiar_medio=round(float(media), 1) if media is not None else None,
        alcance_estimado=int(soma),
    )
