from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.routes import (
    auth, hortas, produtos, canteiros, ciclos,
    demandas, intencoes, usuarios, solicitacoes, zonas_risco,
)
from app.core.config import settings

_cors_origins = settings.CORS_ORIGINS.split(",") if hasattr(settings, "CORS_ORIGINS") else ["*"]

app = FastAPI(
    title="Hortas Urbanas API",
    version="1.0.0",
    description="Sistema de gestão de hortas urbanas comunitárias",
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
