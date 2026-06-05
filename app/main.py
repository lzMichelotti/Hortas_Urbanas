from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

from app.api.routes import (
    auth, hortas, produtos, canteiros, ciclos,
    demandas, intencoes, usuarios, solicitacoes, zonas_risco,
)
from app.core.config import settings
from app.core.logger import logger  
from app.database.session import engine

app = FastAPI(
    title="Hortas Urbanas API",
    version="1.0.0",
    description="Sistema de gestão de hortas urbanas comunitárias",
)

app.add_middleware(GZipMiddleware, minimum_size=500) 
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.error("IntegrityError em %s %s — %s", request.method, request.url.path, exc.orig)
    return JSONResponse(
        status_code=409,
        content={"detail": "Conflito de dados: registro duplicado ou violação de integridade."},
    )


@app.exception_handler(OperationalError)
async def operational_error_handler(request: Request, exc: OperationalError):
    logger.error("OperationalError em %s %s — %s", request.method, request.url.path, exc.orig)
    return JSONResponse(
        status_code=503,
        content={"detail": "Banco de dados temporariamente indisponível."},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error("SQLAlchemyError em %s %s — %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno de banco de dados."},
    )



@app.get("/health", tags=["Health"])
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(hortas.router)
app.include_router(produtos.router)
app.include_router(canteiros.router)
app.include_router(ciclos.router)
app.include_router(demandas.router)
app.include_router(intencoes.router)
app.include_router(solicitacoes.router)
app.include_router(usuarios.router)
app.include_router(zonas_risco.router)
