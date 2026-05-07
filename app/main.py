from fastapi import FastAPI
from app.api.routes import auth, hortas, produtos, canteiros, ciclos, demandas, intencoes, usuarios

app = FastAPI()

app.include_router(auth.router)
app.include_router(hortas.router)
app.include_router(produtos.router)
app.include_router(canteiros.router)
app.include_router(ciclos.router)
app.include_router(demandas.router)
app.include_router(intencoes.router)
app.include_router(usuarios.router)
