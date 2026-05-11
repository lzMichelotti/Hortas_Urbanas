from fastapi import FastAPI
from app.api.routes import auth, hortas, produtos, canteiros, ciclos, demandas, intencoes, usuarios
from app.database.session import engine
from app.database import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Hortas Urbanas API",
    version="1.0.0",
    description="Sistema de gestão de hortas urbanas comunitárias"
)

app.include_router(auth.router)
app.include_router(hortas.router)
app.include_router(produtos.router)
app.include_router(canteiros.router)
app.include_router(ciclos.router)
app.include_router(demandas.router)
app.include_router(intencoes.router)
app.include_router(usuarios.router)
