from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, hortas, produtos, canteiros, ciclos, demandas, intencoes, usuarios, solicitacoes
from app.database.session import engine
from app.database import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Hortas Urbanas API",
    version="1.0.0",
    description="Sistema de gestão de hortas urbanas comunitárias"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
