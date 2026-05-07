from sqlalchemy.exc import SQLAlchemyError

def seed_produtos():
    try:
        from database import SessionLocal, Produto
    except Exception as exc:
        print(f"Não foi possível carregar a configuração do banco: {exc}")
        return

    db = SessionLocal()
    
    # Lista processada a partir dos seus dados
    produtos_data = [
        # --- HORTALIÇAS ---
        {"nome": "Abóbora", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "OUT./FEV.", "inicio_colheita": "90-120 DIAS"},
        {"nome": "Abobrinha", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "SET./MAIO", "inicio_colheita": "45-60 DIAS"},
        {"nome": "Agrião", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "FEV./OUT.", "inicio_colheita": "60-70 DIAS"},
        {"nome": "Alface Inverno", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "FEV./OUT.", "inicio_colheita": "60-80 DIAS"},
        {"nome": "Alface Verão", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "ANO TODO", "inicio_colheita": "50-70 DIAS"},
        {"nome": "Alho", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "MAIO/JUN.", "inicio_colheita": "150-180 DIAS"},
        {"nome": "Alho Poró", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "MAR./JUN.", "inicio_colheita": "90-120 DIAS"},
        {"nome": "Almeirão", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "FEV./OUT.", "inicio_colheita": "60-70 DIAS"},
        {"nome": "Batata", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "NOV./DEZ.", "inicio_colheita": "90-120 DIAS"},
        {"nome": "Batata Doce", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "OUT./DEZ.", "inicio_colheita": "120-150 DIAS"},
        {"nome": "Berinjela", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "AGO./JAN.", "inicio_colheita": "100-120 DIAS"},
        {"nome": "Beterraba", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "ANO TODO", "inicio_colheita": "60-70 DIAS"},
        {"nome": "Brócolis Inverno", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "FEV./SET.", "inicio_colheita": "90-100 DIAS"},
        {"nome": "Cebola", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "JUL./AGO.", "inicio_colheita": "120-180 DIAS"},
        {"nome": "Cenoura", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "FEV./AGO.", "inicio_colheita": "90-110 DIAS"},
        {"nome": "Couve", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "ANO TODO", "inicio_colheita": "60-70 DIAS"},
        {"nome": "Espinafre", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "FEV./SET.", "inicio_colheita": "60-80 DIAS"},
        {"nome": "Tomate", "categoria": "Hortaliças", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "SET./FEV.", "inicio_colheita": "100-120 DIAS"},

        # --- FRUTAS ---
        {"nome": "Abacate", "categoria": "Frutas", "da_em_arvore": True, "necessita_replantio": False, "epoca_recomendada": "Set-Nov", "inicio_colheita": "Mar-Ago"},
        {"nome": "Abacaxi", "categoria": "Frutas", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "Set-Dez", "inicio_colheita": "12-18 meses"},
        {"nome": "Banana", "categoria": "Frutas", "da_em_arvore": False, "necessita_replantio": False, "epoca_recomendada": "Set-Dez", "inicio_colheita": "ANO TODO"},
        {"nome": "Bergamota", "categoria": "Frutas", "da_em_arvore": True, "necessita_replantio": False, "epoca_recomendada": "Ago-Out", "inicio_colheita": "Abr-Jul"},
        {"nome": "Goiaba", "categoria": "Frutas", "da_em_arvore": True, "necessita_replantio": False, "epoca_recomendada": "Set-Nov", "inicio_colheita": "Dez-Abr"},
        {"nome": "Laranja", "categoria": "Frutas", "da_em_arvore": True, "necessita_replantio": False, "epoca_recomendada": "Ago-Out", "inicio_colheita": "Mai-Set"},
        {"nome": "Limão", "categoria": "Frutas", "da_em_arvore": True, "necessita_replantio": False, "epoca_recomendada": "Ago-Out", "inicio_colheita": "Ano todo"},
        {"nome": "Maçã", "categoria": "Frutas", "da_em_arvore": True, "necessita_replantio": False, "epoca_recomendada": "Jun-Ago", "inicio_colheita": "Fev-Abr"},
        {"nome": "Manga", "categoria": "Frutas", "da_em_arvore": True, "necessita_replantio": False, "epoca_recomendada": "Set-Nov", "inicio_colheita": "Dez-Mar"},
        {"nome": "Morango", "categoria": "Frutas", "da_em_arvore": False, "necessita_replantio": True, "epoca_recomendada": "MAR./ABR.", "inicio_colheita": "70-80 DIAS"},
        {"nome": "Uva", "categoria": "Frutas", "da_em_arvore": False, "necessita_replantio": False, "epoca_recomendada": "JUL./SET.", "inicio_colheita": "JAN./MARAR."}
    ]

    try:
        for p_data in produtos_data:
            # Upsert simples: só adiciona se o nome não existir
            obj = db.query(Produto).filter(Produto.nome == p_data["nome"]).first()
            if not obj:
                db.add(Produto(**p_data))

        db.commit()
        print(f"{len(produtos_data)} produtos processados no banco de dados.")
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Erro ao popular o banco: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_produtos()