"""Popula o banco com os dados de seed: um admin e o catálogo de produtos.

Rode depois de criar o esquema com `alembic upgrade head`:

    python scripts/seed.py

É idempotente — faz upsert do catálogo, então pode rodar quantas vezes quiser.
"""
import sys
from pathlib import Path

# Garante que o pacote app/ seja importável ao rodar `python scripts/seed.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.exc import SQLAlchemyError

from app.database.session import SessionLocal
from app.database.models import Usuario, Produto
from app.core.security import get_password_hash


# Admin demo. O login é e-mail + CPF; a senha é o próprio CPF.
ADMIN = {
    "nome": "Adm",
    "email": "admin@hortasurbanas.com",
    "cpf": "92263020063",
    "telefone": "55981083084",
    "privilegio": "ADMIN_SUPREMO",
}

# Catálogo derivado dos recursos .tres do frontend (fonte da verdade).
# epoca_recomendada: meses PT-BR maiúsculos com hífen (ex: "OUT-FEV") ou "ANO TODO"
# inicio_colheita:   "<min>-<max> DIAS" / meses (ex: "MAR-AGO") / estação (ex: "VERÃO-OUTONO") / "ANO TODO"
PRODUTOS = [
    {"nome": "Abóbora",            "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "OUT-FEV",          "inicio_colheita": "90-120 DIAS"},
    {"nome": "Abobrinha",          "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-MAI",          "inicio_colheita": "45-60 DIAS"},
    {"nome": "Agrião",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-OUT",          "inicio_colheita": "60-70 DIAS"},
    {"nome": "Alface Inverno",     "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-OUT",          "inicio_colheita": "60-80 DIAS"},
    {"nome": "Alface Verão",       "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "ANO TODO",         "inicio_colheita": "50-70 DIAS"},
    {"nome": "Alho",               "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "MAI-JUN",          "inicio_colheita": "150-180 DIAS"},
    {"nome": "Alho Poró",          "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "MAR-JUN",          "inicio_colheita": "90-120 DIAS"},
    {"nome": "Almeirão",           "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-OUT",          "inicio_colheita": "60-70 DIAS"},
    {"nome": "Batata",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "NOV-DEZ",          "inicio_colheita": "90-120 DIAS"},
    {"nome": "Batata Doce",        "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "OUT-DEZ",          "inicio_colheita": "120-150 DIAS"},
    {"nome": "Berinjela",          "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "AGO-JAN",          "inicio_colheita": "100-120 DIAS"},
    {"nome": "Beterraba",          "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "ANO TODO",         "inicio_colheita": "60-70 DIAS"},
    {"nome": "Brócolis Inverno",   "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-SET",          "inicio_colheita": "90-100 DIAS"},
    {"nome": "Brócolis Verão",     "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "OUT-DEZ",          "inicio_colheita": "80-100 DIAS"},
    {"nome": "Cebola",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "JUL-AGO",          "inicio_colheita": "120-180 DIAS"},
    {"nome": "Cebolinha",          "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "ANO TODO",         "inicio_colheita": "80-100 DIAS"},
    {"nome": "Cenoura Inverno",    "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-AGO",          "inicio_colheita": "90-100 DIAS"},
    {"nome": "Cenoura Verão",      "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "NOV-JAN",          "inicio_colheita": "85-100 DIAS"},
    {"nome": "Chuchu",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-OUT",          "inicio_colheita": "100-120 DIAS"},
    {"nome": "Coentro",            "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-JAN",          "inicio_colheita": "50-60 DIAS"},
    {"nome": "Couve",              "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-JUL",          "inicio_colheita": "80-90 DIAS"},
    {"nome": "Couve Chinesa",      "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "ANO TODO",         "inicio_colheita": "60-70 DIAS"},
    {"nome": "Ervilha",            "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "ABR-MAI",          "inicio_colheita": "60-70 DIAS"},
    {"nome": "Espinafre",          "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-SET",          "inicio_colheita": "60-80 DIAS"},
    {"nome": "Inhame",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "JUN-SET",          "inicio_colheita": "150-180 DIAS"},
    {"nome": "Melancia",           "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-JAN",          "inicio_colheita": "85-90 DIAS"},
    {"nome": "Melão",              "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-FEV",          "inicio_colheita": "80-120 DIAS"},
    {"nome": "Milho Verde",        "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "AGO-FEV",          "inicio_colheita": "80-110 DIAS"},
    {"nome": "Moranga",            "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-DEZ",          "inicio_colheita": "120-150 DIAS"},
    {"nome": "Mostarda",           "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "JUL-DEZ",          "inicio_colheita": "45-50 DIAS"},
    {"nome": "Pimenta",            "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-FEV",          "inicio_colheita": "90-120 DIAS"},
    {"nome": "Pimentão",           "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-FEV",          "inicio_colheita": "100-120 DIAS"},
    {"nome": "Quiabo",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "OUT-DEZ",          "inicio_colheita": "70-80 DIAS"},
    {"nome": "Rabanete",           "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "MAR-AGO",          "inicio_colheita": "20-30 DIAS"},
    {"nome": "Repolho Verão",      "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "NOV-JAN",          "inicio_colheita": "90-110 DIAS"},
    {"nome": "Repolho Inverno",    "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-SET",          "inicio_colheita": "90-110 DIAS"},
    {"nome": "Rúcula",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "MAR-AGO",          "inicio_colheita": "30-40 DIAS"},
    {"nome": "Salsa",              "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "MAR-SET",          "inicio_colheita": "30-40 DIAS"},
    {"nome": "Tomate",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-FEV",          "inicio_colheita": "100-120 DIAS"},
    {"nome": "Chicória",           "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-JUL",          "inicio_colheita": "60-70 DIAS"},
    {"nome": "Couve Flor Inverno", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "FEV-JUN",          "inicio_colheita": "100-110 DIAS"},
    {"nome": "Couve Flor Verão",   "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "DEZ-JAN",          "inicio_colheita": "90-100 DIAS"},
    {"nome": "Feijão-Vagem",       "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-MAR",          "inicio_colheita": "60-70 DIAS"},
    {"nome": "Gengibre",           "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "AGO-DEZ",          "inicio_colheita": "240-300 DIAS"},
    {"nome": "Maxixe",             "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-FEV",          "inicio_colheita": "60-70 DIAS"},
    {"nome": "Nabo",               "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "ABR-MAI",          "inicio_colheita": "50-60 DIAS"},
    {"nome": "Abacate",            "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "SET-NOV",          "inicio_colheita": "MAR-AGO"},
    {"nome": "Abacaxi",            "categoria": "Frutas",     "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "SET-DEZ",          "inicio_colheita": "365-485 DIAS"},
    {"nome": "Banana",             "categoria": "Frutas",     "da_em_arvore": False, "necessita_replantio": False, "epoca_recomendada": "SET-DEZ",          "inicio_colheita": "ANO TODO"},
    {"nome": "Bergamota",          "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "AGO-OUT",          "inicio_colheita": "ABR-JUL"},
    {"nome": "Goiaba",             "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "SET-NOV",          "inicio_colheita": "DEZ-ABR"},
    {"nome": "Laranja",            "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "AGO-MAI",          "inicio_colheita": "MAI-SET"},
    {"nome": "Limão",              "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "AGO-OUT",          "inicio_colheita": "ANO TODO"},
    {"nome": "Maçã",               "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "JUN-AGO",          "inicio_colheita": "FEV-ABR"},
    {"nome": "Manga",              "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "SET-NOV",          "inicio_colheita": "DEZ-MAR"},
    {"nome": "Morango",            "categoria": "Frutas",     "da_em_arvore": False, "necessita_replantio": True,  "epoca_recomendada": "MAR-ABR",          "inicio_colheita": "70-80 DIAS"},
    {"nome": "Uva",                "categoria": "Frutas",     "da_em_arvore": False, "necessita_replantio": False, "epoca_recomendada": "JUL-SET",          "inicio_colheita": "JAN-MAR"},
    {"nome": "Ameixa",             "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "JUN-AGO",          "inicio_colheita": "NOV-JAN"},
    {"nome": "Caqui",              "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "JUN-AGO",          "inicio_colheita": "MAR-MAI"},
    {"nome": "Figo",               "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "JUL-SET",          "inicio_colheita": "DEZ-MAR"},
    {"nome": "Jaboticaba",         "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "SET-NOV",          "inicio_colheita": "SET-NOV"},
    {"nome": "Kiwi",               "categoria": "Frutas",     "da_em_arvore": False, "necessita_replantio": False, "epoca_recomendada": "JUL-SET",          "inicio_colheita": "MAR-MAI"},
    {"nome": "Mamão",              "categoria": "Frutas",     "da_em_arvore": False, "necessita_replantio": False, "epoca_recomendada": "SET-DEZ",          "inicio_colheita": "240-365 DIAS"},
    {"nome": "Maracujá",           "categoria": "Frutas",     "da_em_arvore": False, "necessita_replantio": False, "epoca_recomendada": "AGO-SET, JAN-MAR",  "inicio_colheita": "VERÃO-OUTONO"},
    {"nome": "Pera",               "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "JUN-AGO",          "inicio_colheita": "JAN-MAR"},
    {"nome": "Pêssego",            "categoria": "Frutas",     "da_em_arvore": True,  "necessita_replantio": False, "epoca_recomendada": "JUN-AGO",          "inicio_colheita": "OUT-DEZ"},
    {"nome": "Pitaya",             "categoria": "Frutas",     "da_em_arvore": False, "necessita_replantio": False, "epoca_recomendada": "SET-DEZ",          "inicio_colheita": "DEZ-ABR"},
]


def seed_admin(db):
    if db.query(Usuario).filter(Usuario.email == ADMIN["email"]).first():
        print(f"Admin {ADMIN['email']} já existe — pulando.")
        return
    db.add(Usuario(**ADMIN, senha_hash=get_password_hash(ADMIN["cpf"])))
    print(f"Admin criado: {ADMIN['email']} (senha = CPF {ADMIN['cpf']}).")


def seed_produtos(db):
    """Upsert do catálogo: insere o que falta e atualiza o que divergir do .tres
    (o frontend é a fonte da verdade)."""
    novos = atualizados = 0
    for p in PRODUTOS:
        existente = db.query(Produto).filter(Produto.nome == p["nome"]).first()
        if existente is None:
            db.add(Produto(**p))
            novos += 1
            continue
        mudou = False
        for campo, valor in p.items():
            if getattr(existente, campo) != valor:
                setattr(existente, campo, valor)
                mudou = True
        atualizados += int(mudou)

    print(f"Produtos: {novos} novos, {atualizados} atualizados ({len(PRODUTOS)} no catálogo).")


def main():
    db = SessionLocal()
    try:
        seed_admin(db)
        seed_produtos(db)
        db.commit()
        print("Seed concluído.")
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Erro ao popular o banco: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
