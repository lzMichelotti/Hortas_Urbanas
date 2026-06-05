import uuid
from typing import Annotated, Optional

from fastapi import Header
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


# Tipo reutilizável para endpoints: Header opcional, validado como UUID pelo FastAPI.
# Header ausente → None. Header malformado → 422 (validação automática).
IdempotencyKeyHeader = Annotated[Optional[uuid.UUID], Header(alias="Idempotency-Key")]


def commit_idempotente(
    db: Session,
    db_obj,
    idempotency_key: Optional[uuid.UUID],
    **escopo,
):
    """Commita `db_obj`. Se vier IntegrityError pela UNIQUE da idempotency_key,
    devolve o registro existente no mesmo escopo (ex: mesmo canteiro_id).

    Se idempotency_key for None, comportamento idêntico a um commit normal —
    duplicatas não são detectadas (decisão do cliente de não enviar o header).
    """
    if idempotency_key is not None:
        db_obj.idempotency_key = idempotency_key

    db.add(db_obj)
    try:
        db.commit()
        return db_obj
    except IntegrityError as e:
        db.rollback()
        constraint = (getattr(getattr(e.orig, "diag", None), "constraint_name", "") or "").lower()
        if idempotency_key is not None and "idempotency" in constraint:
            existente = (
                db.query(type(db_obj))
                .filter_by(idempotency_key=idempotency_key, **escopo)
                .first()
            )
            if existente is not None:
                return existente
        # Outras violações (FK, check constraint, etc.) sobem para o handler global
        raise
