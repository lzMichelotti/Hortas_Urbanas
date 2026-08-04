from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database.session import get_db
from app.database.models import Post, PostImagem, Resposta, Denuncia, Curtida, Horta, Usuario
from app.database.enums import TipoPost
from app.core import storage
from app.core.config import settings
from app.dependencies import get_admin_user, get_current_user, get_current_user_opcional
from app.permissions import exigir_dono_ou_moderador
from app.schemas.forum import (
    PostCreate, RespostaCreate, DenunciaCreate, DenunciaRead,
    PresignRequest, PresignResponse, ConfirmRequest,
    AutorRead, PostRead, PostImagemRead, PostDetalhe, RespostaRead, FeedRead, LikeRead,
)

router = APIRouter(prefix="/forum", tags=["Fórum"])

DBDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[Usuario, Depends(get_current_user)]
UserOpcionalDep = Annotated[Optional[Usuario], Depends(get_current_user_opcional)]

_AUTOR_COM_HORTA = joinedload(Post.autor).joinedload(Usuario.horta)

LIMITE_DENUNCIAS = 100
MAX_TRECHO = 280


def _autor(u: Optional[Usuario]) -> Optional[AutorRead]:
    if u is None:
        return None
    return AutorRead(id=u.id, nome=u.nome, avatar=u.avatar, horta=u.horta.nome if u.horta else None)


def _imagens(post: Post) -> list[PostImagemRead]:
    return [
        PostImagemRead(
            id=img.id,
            image_url=storage.url_publica(img.object_key),
            content_type=img.content_type,
        )
        for img in post.imagens
    ]


def _post_read(post: Post, count: int, likes: int = 0, eu_curti: bool = False) -> PostRead:
    return PostRead(
        id=post.id, autor=_autor(post.autor), tipo=post.tipo,
        conteudo=post.conteudo, imagens=_imagens(post),
        criado_em=post.criado_em, respostas_count=count,
        likes_count=likes, eu_curti=eu_curti,
    )


def _resposta_read(r: Resposta) -> RespostaRead:
    return RespostaRead(
        id=r.id, post_id=r.post_id, autor=_autor(r.autor),
        conteudo=r.conteudo, criado_em=r.criado_em,
    )


@router.get("/posts", response_model=FeedRead)
def listar_posts(
    db: DBDep,
    usuario: UserOpcionalDep,
    cursor: Annotated[Optional[int], Query(gt=0)] = None,
    limit: Annotated[int, Query(gt=0, le=50)] = 20,
    tipo: Annotated[Optional[TipoPost], Query()] = None,
):
    query = db.query(Post).options(_AUTOR_COM_HORTA, selectinload(Post.imagens)).order_by(Post.id.desc())
    if tipo is not None:
        query = query.filter(Post.tipo == tipo.value)
    if cursor is not None:
        query = query.filter(Post.id < cursor)

    posts = query.limit(limit + 1).all()
    tem_mais = len(posts) > limit
    posts = posts[:limit]

    ids = [p.id for p in posts]
    contagens = dict(
        db.query(Resposta.post_id, func.count(Resposta.id))
        .filter(Resposta.post_id.in_(ids))
        .group_by(Resposta.post_id)
        .all()
    ) if ids else {}
    likes = dict(
        db.query(Curtida.post_id, func.count(Curtida.id))
        .filter(Curtida.post_id.in_(ids))
        .group_by(Curtida.post_id)
        .all()
    ) if ids else {}
    curtidos = {
        pid for (pid,) in db.query(Curtida.post_id)
        .filter(Curtida.post_id.in_(ids), Curtida.usuario_id == usuario.id)
        .all()
    } if usuario and ids else set()

    return FeedRead(
        items=[
            _post_read(p, contagens.get(p.id, 0), likes.get(p.id, 0), p.id in curtidos)
            for p in posts
        ],
        proximo_cursor=posts[-1].id if tem_mais and posts else None,
    )


@router.get("/posts/{id}", response_model=PostDetalhe)
def ler_post(id: int, db: DBDep, usuario: UserOpcionalDep):
    post = (
        db.query(Post)
        .options(
            _AUTOR_COM_HORTA,
            selectinload(Post.imagens),
            joinedload(Post.respostas).joinedload(Resposta.autor).joinedload(Usuario.horta),
        )
        .filter(Post.id == id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    likes = db.query(func.count(Curtida.id)).filter(Curtida.post_id == id).scalar()
    eu_curti = bool(
        usuario
        and db.query(Curtida.id)
        .filter(Curtida.post_id == id, Curtida.usuario_id == usuario.id)
        .first()
    )
    return PostDetalhe(
        id=post.id, autor=_autor(post.autor), tipo=post.tipo,
        conteudo=post.conteudo, imagens=_imagens(post),
        criado_em=post.criado_em,
        respostas=[_resposta_read(r) for r in post.respostas],
        likes_count=likes, eu_curti=eu_curti,
    )


@router.post("/posts", response_model=PostRead, status_code=201)
def criar_post(post: PostCreate, db: DBDep, usuario: UserDep):
    db_post = Post(autor_id=usuario.id, conteudo=post.conteudo, tipo=post.tipo.value)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return _post_read(db_post, 0)


@router.post("/posts/{id}/images/presign", response_model=PresignResponse)
def presign_imagem(id: int, dados: PresignRequest, db: DBDep, usuario: UserDep):
    if not storage.configurado():
        raise HTTPException(status_code=503, detail="Armazenamento de imagens indisponível.")
    post = db.query(Post).filter(Post.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    if post.autor_id != usuario.id:
        raise HTTPException(status_code=403, detail="Você só pode adicionar fotos aos seus posts.")
    total = db.query(func.count(PostImagem.id)).filter(PostImagem.post_id == id).scalar()
    if total >= settings.R2_MAX_IMAGENS_POR_POST:
        raise HTTPException(status_code=409, detail=f"Limite de {settings.R2_MAX_IMAGENS_POR_POST} fotos por post.")

    key = storage.nova_chave(id, dados.content_type)
    upload_url = storage.gerar_presign_put(key, dados.content_type)
    return PresignResponse(upload_url=upload_url, key=key)


@router.post("/posts/{id}/images/confirm", response_model=PostImagemRead, status_code=201)
def confirmar_imagem(id: int, dados: ConfirmRequest, db: DBDep, usuario: UserDep):
    post = db.query(Post).filter(Post.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    if post.autor_id != usuario.id:
        raise HTTPException(status_code=403, detail="Você só pode adicionar fotos aos seus posts.")
    if not dados.key.startswith(f"posts/{id}/"):
        raise HTTPException(status_code=400, detail="Chave inválida para este post.")
    total = db.query(func.count(PostImagem.id)).filter(PostImagem.post_id == id).scalar()
    if total >= settings.R2_MAX_IMAGENS_POR_POST:
        raise HTTPException(status_code=409, detail=f"Limite de {settings.R2_MAX_IMAGENS_POR_POST} fotos por post.")

    info = storage.head_objeto(dados.key)
    if info is None:
        raise HTTPException(status_code=400, detail="Imagem não encontrada no armazenamento.")
    if info["tamanho"] > settings.R2_MAX_BYTES:
        storage.apagar_objeto(dados.key)
        raise HTTPException(status_code=413, detail="Imagem excede o tamanho máximo.")
    if info["content_type"] not in storage.CONTENT_TYPES:
        storage.apagar_objeto(dados.key)
        raise HTTPException(status_code=400, detail="Tipo de imagem não suportado.")

    imagem = PostImagem(post_id=id, object_key=dados.key, content_type=info["content_type"])
    db.add(imagem)
    db.commit()
    db.refresh(imagem)
    return PostImagemRead(
        id=imagem.id,
        image_url=storage.url_publica(imagem.object_key),
        content_type=imagem.content_type,
    )


@router.post("/posts/{id}/respostas", response_model=RespostaRead, status_code=201)
def criar_resposta(id: int, resposta: RespostaCreate, db: DBDep, usuario: UserDep):
    if not db.query(Post.id).filter(Post.id == id).first():
        raise HTTPException(status_code=404, detail="Post não encontrado.")

    db_resposta = Resposta(post_id=id, autor_id=usuario.id, conteudo=resposta.conteudo)
    db.add(db_resposta)
    db.commit()
    db.refresh(db_resposta)
    return _resposta_read(db_resposta)


@router.post("/posts/{id}/like", response_model=LikeRead)
def alternar_like(id: int, db: DBDep, usuario: UserDep):
    if not db.query(Post.id).filter(Post.id == id).first():
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    curtida = (
        db.query(Curtida)
        .filter(Curtida.post_id == id, Curtida.usuario_id == usuario.id)
        .first()
    )
    if curtida:
        db.delete(curtida)
        eu_curti = False
    else:
        db.add(Curtida(post_id=id, usuario_id=usuario.id))
        eu_curti = True
    db.commit()
    likes = db.query(func.count(Curtida.id)).filter(Curtida.post_id == id).scalar()
    return LikeRead(likes_count=likes, eu_curti=eu_curti)


@router.delete("/posts/{id}", status_code=204)
def apagar_post(id: int, db: DBDep, usuario: UserDep):
    post = (
        db.query(Post)
        .options(selectinload(Post.imagens))
        .filter(Post.id == id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    exigir_dono_ou_moderador(usuario, post.autor_id)
    keys = [img.object_key for img in post.imagens]
    db.delete(post)
    db.commit()
    for key in keys:
        storage.apagar_objeto_best_effort(key)


@router.delete("/images/{id}", status_code=204)
def apagar_imagem(id: int, db: DBDep, usuario: UserDep):
    imagem = (
        db.query(PostImagem)
        .options(joinedload(PostImagem.post))
        .filter(PostImagem.id == id)
        .first()
    )
    if not imagem:
        raise HTTPException(status_code=404, detail="Imagem não encontrada.")
    exigir_dono_ou_moderador(usuario, imagem.post.autor_id if imagem.post else None)
    key = imagem.object_key
    db.delete(imagem)
    db.commit()
    storage.apagar_objeto_best_effort(key)


@router.delete("/respostas/{id}", status_code=204)
def apagar_resposta(id: int, db: DBDep, usuario: UserDep):
    resposta = db.query(Resposta).filter(Resposta.id == id).first()
    if not resposta:
        raise HTTPException(status_code=404, detail="Resposta não encontrada.")
    exigir_dono_ou_moderador(usuario, resposta.autor_id)
    db.delete(resposta)
    db.commit()


@router.get("/denuncias", response_model=list[DenunciaRead])
def listar_denuncias(db: DBDep, _: Annotated[Usuario, Depends(get_admin_user)]):
    autor_id = func.coalesce(Post.autor_id, Resposta.autor_id)
    linhas = (
        db.query(
            Denuncia,
            func.coalesce(Post.conteudo, Resposta.conteudo).label("conteudo"),
            Usuario,
            Horta.nome.label("horta"),
            func.coalesce(Post.id, Resposta.post_id).label("post_id"),
        )
        .outerjoin(Post, Post.id == Denuncia.post_id)
        .outerjoin(Resposta, Resposta.id == Denuncia.resposta_id)
        .outerjoin(Usuario, Usuario.id == autor_id)
        .outerjoin(Horta, Horta.id == Usuario.horta_id)
        .order_by(Denuncia.id.desc())
        .limit(LIMITE_DENUNCIAS)
        .all()
    )
    return [
        DenunciaRead(
            id=d.id,
            post_id=post_id,
            resposta_id=d.resposta_id,
            trecho=(conteudo or "")[:MAX_TRECHO],
            autor=AutorRead(
                id=autor.id, nome=autor.nome, avatar=autor.avatar, horta=horta
            ) if autor else None,
            motivo=d.motivo,
            criado_em=d.criado_em,
        )
        for d, conteudo, autor, horta, post_id in linhas
    ]


@router.post("/posts/{id}/denuncia", status_code=201)
def denunciar_post(id: int, denuncia: DenunciaCreate, db: DBDep, usuario: UserDep):
    if not db.query(Post.id).filter(Post.id == id).first():
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    db.add(Denuncia(post_id=id, denunciante_id=usuario.id, motivo=denuncia.motivo))
    db.commit()
    return {"detail": "Denúncia registrada."}


@router.delete("/denuncias/{id}", status_code=204)
def arquivar_denuncia(id: int, db: DBDep, _: Annotated[Usuario, Depends(get_admin_user)]):
    """Denúncia analisada e sem providência. Apagar o conteúdo denunciado já
    limpa a fila sozinho, via CASCADE — isto aqui é para o caso de manter o post."""
    denuncia = db.query(Denuncia).filter(Denuncia.id == id).first()
    if not denuncia:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada.")
    db.delete(denuncia)
    db.commit()


@router.post("/respostas/{id}/denuncia", status_code=201)
def denunciar_resposta(id: int, denuncia: DenunciaCreate, db: DBDep, usuario: UserDep):
    if not db.query(Resposta.id).filter(Resposta.id == id).first():
        raise HTTPException(status_code=404, detail="Resposta não encontrada.")
    db.add(Denuncia(resposta_id=id, denunciante_id=usuario.id, motivo=denuncia.motivo))
    db.commit()
    return {"detail": "Denúncia registrada."}
