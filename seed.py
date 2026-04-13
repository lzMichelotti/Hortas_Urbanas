from database import SessionLocal, Horta, Canteiro, Produto, Usuario, engine, Base
from datetime import date

## ARQUIVO DESTINADO A POVOAR O BANCO DE DADOS PARA TESTE ##

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    print("Iniciando o povoamento do banco de dados...")

    produtos_iniciais = [
        # Hortaliças
        Produto(nome="Alface Crespa", categoria="Hortaliças", da_em_arvore=False, necessita_replantio=True),
        Produto(nome="Couve", categoria="Hortaliças", da_em_arvore=False, necessita_replantio=False),
        
        # Legumes
        Produto(nome="Tomate", categoria="Legumes", da_em_arvore=False, necessita_replantio=True),
        Produto(nome="Cenoura", categoria="Legumes", da_em_arvore=False, necessita_replantio=True),
        
        # Culturas Anuais
        Produto(nome="Mandioca (Aipim)", categoria="Culturas Anuais", da_em_arvore=False, necessita_replantio=True),
        Produto(nome="Milho", categoria="Culturas Anuais", da_em_arvore=False, necessita_replantio=True)
    ]
    db.add_all(produtos_iniciais)
    db.commit() 

    horta_teste = Horta(
        nome="Horta Comunitária UFSM",
        rua="Av. Roraima",
        numero="1000",
        bairro="Camobi",
        cep="97105-900",
        cidade="Santa Maria",
        uf="RS",
        latitude=-29.712,
        longitude=-53.715,
        area_total=500.0,
        publico_atendido="Comunidade universitária e moradores locais"
    )
    db.add(horta_teste)
    db.commit()
    db.refresh(horta_teste) 

    # Obs: a senha_hash vai receber o próprio CPF só para termos o dado preenchido.
    # No backend, nós vamos criar a função que embaralha isso de verdade.
    usuarios_iniciais = [
        Usuario(nome="Lorenzo", email="admin@plataforma.com", cpf="11111111111", senha_hash="hash_111", telefone="55999999999", privilegio="ADMIN_SUPREMO"),
        Usuario(nome="Rafael Teodósio", email="rafael@hortaufsm.com", cpf="22222222222", senha_hash="hash_222", telefone="55988888888", privilegio="LIDER_HORTA", horta_id=horta_teste.id),
        Usuario(nome="Luciano", email="luciano@membro.com", cpf="33333333333", senha_hash="hash_333", telefone="55977777777", privilegio="MEMBRO_CANTEIRO", horta_id=horta_teste.id)
    ]
    db.add_all(usuarios_iniciais)
    db.commit()

    canteiros_iniciais = [
        Canteiro(horta_id=horta_teste.id, usuario_id=2, identificacao="Canteiro Central (Líder)", area_produtiva=20.0, area_ociosa=5.0),
        Canteiro(horta_id=horta_teste.id, usuario_id=3, identificacao="Canteiro das Raízes (Membro)", area_produtiva=10.0, area_ociosa=2.0)
    ]
    db.add_all(canteiros_iniciais)
    db.commit()

    print("✅ Povoamento concluído com sucesso!")
    print("- Produtos cadastrados.")
    print("- Horta da UFSM cadastrada.")
    print("- Usuários (Admin, Líder e Membro) criados.")
    print("- Canteiros distribuídos.")

except Exception as e:
    print(f"❌ Erro ao popular o banco: {e}")
    db.rollback()
finally:
    db.close()