import hashlib
from typing import Any

import orjson
from fastapi import Request, Response
from pydantic import BaseModel


def aplica_etag(
    request: Request,
    payload: Any,
    cache_control: str | None = None,
    vary: str = "Accept-Encoding",
) -> Response:
    """Devolve 304 se o cliente já tem o conteúdo; senão devolve 200 + ETag.

    ETag é gerado como hash MD5 (weak) do payload serializado em JSON. Como o
    GZipMiddleware comprime depois desta etapa, dois clientes com/sem suporte a
    gzip recebem bytes diferentes mas o mesmo ETag fraco — comportamento correto
    segundo RFC 9110 §8.8.3.
    """
    body = _dump_payload(payload)
    etag = f'W/"{hashlib.md5(body).hexdigest()}"'

    headers = {"ETag": etag, "Vary": vary}
    if cache_control:
        headers["Cache-Control"] = cache_control

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)

    return Response(content=body, media_type="application/json", headers=headers)


def _dump_payload(payload: Any) -> bytes:
    if isinstance(payload, BaseModel):
        return orjson.dumps(payload.model_dump(mode="json"))
    if isinstance(payload, list):
        return orjson.dumps([
            item.model_dump(mode="json") if isinstance(item, BaseModel) else item
            for item in payload
        ])
    return orjson.dumps(payload)
