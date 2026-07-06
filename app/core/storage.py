"""Cliente do Cloudflare R2 (S3-compatível) para as fotos do fórum.

As chaves do R2 ficam só aqui no backend. O app nunca as vê: recebe uma
presigned URL e sobe o arquivo direto pro R2.
"""
import uuid
from functools import lru_cache
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.logger import logger

EXTENSOES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
CONTENT_TYPES = set(EXTENSOES)


class StorageError(RuntimeError):
    pass


def configurado() -> bool:
    return all((
        settings.R2_ACCOUNT_ID,
        settings.R2_ACCESS_KEY_ID,
        settings.R2_SECRET_ACCESS_KEY,
        settings.R2_BUCKET_NAME,
    ))


@lru_cache
def _client():
    if not configurado():
        raise StorageError("R2 não configurado: defina as variáveis R2_* no .env.")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
    )


def nova_chave(post_id: int, content_type: str) -> str:
    return f"posts/{post_id}/{uuid.uuid4().hex}.{EXTENSOES[content_type]}"


def gerar_presign_put(key: str, content_type: str) -> str:
    return _client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.R2_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=settings.R2_PRESIGN_EXPIRES,
    )


def head_objeto(key: str) -> Optional[dict]:
    try:
        resp = _client().head_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
    except ClientError:
        return None
    return {"tamanho": resp["ContentLength"], "content_type": resp.get("ContentType")}


def apagar_objeto(key: str) -> None:
    _client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)


def apagar_objeto_best_effort(key: str) -> None:
    if not configurado():
        return
    try:
        _client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
    except ClientError as e:
        logger.warning("Falha ao apagar objeto R2 %s: %s", key, e)


def url_publica(key: str) -> str:
    return f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"
