import sqlalchemy as db

DATABASE_URL = "postgresql://horta:horta1234@127.0.0.1:5435/horta_db"

engine = db.create_engine(DATABASE_URL)
conn = engine.connect() 
metadata = db.MetaData()

Hortas = db.Table('Hortas', metadata,
    db.Column('id', db.Integer(), primary_key=True),
    db.Column('nome', db.String(255), nullable=False),
    db.Column('latitude', db.Float),
    db.Column('longitude', db.Float),
    db.Column('area_total', db.Float),
    db.Column('area_produtiva', db.Float),
    db.Column('area_ociosa', db.Float),
    db.Column('publico_atendido', db.Text)
)

Produtos = db.Table('Produtos', metadata,
    db.Column('id', db.Integer(), primary_key=True),
    db.Column('nome', db.String(255), nullable=False),
    db.Column('categoria', db.String(50)),
    db.Column('da_em_arvore', db.Boolean),
    db.Column('necessita_replantio', db.Boolean)
)

Ciclos_Producao = db.Table('Ciclos_Producao', metadata,
    db.Column('id', db.Integer(), primary_key=True),
    db.Column('horta_id', db.Integer(), db.ForeignKey('Hortas.id'), nullable=False),
    db.Column('produto_id', db.Integer(), db.ForeignKey('Produtos.id'), nullable=False),
    db.Column('data_plantio', db.Date),
    db.Column('previsao_colheita', db.Date),
    db.Column('data_colheita_real', db.Date, nullable=True),
    db.Column('status', db.String(50))
)

Usuarios = db.Table('Usuarios', metadata,
    db.Column('id', db.Integer(), primary_key=True),
    db.Column('horta_id', db.Integer(), db.ForeignKey('Hortas.id'), nullable=True),
    db.Column('nome', db.String(255), nullable=False),
    db.Column('cpf', db.String(14), unique=True, nullable=False),
    #db.Column('email', db.String(255), unique=True, nullable=True),
    db.Column('senha_hash', db.String(255), nullable=False),
    db.Column('telefone', db.String(20)),
    db.Column('privilegio', db.String(50), nullable=False) # Ex: 'ADMIN_HORTA', 'MEMBRO'
)

Intencoes_Plantio = db.Table('Intencoes_Plantio', metadata,
    db.Column('id', db.Integer(), primary_key=True),
    db.Column('horta_id', db.Integer(), db.ForeignKey('Hortas.id'), nullable=False),
    db.Column('produto_id', db.Integer(), db.ForeignKey('Produtos.id'), nullable=False),
    db.Column('justificativa_comunidade', db.Text), 
    db.Column('data_desejada_plantio', db.Date, nullable=True),
    db.Column('status', db.String(50)) # Ex: 'PLANEJADO', 'EXECUTADO', 'CANCELADO'
)

Demandas = db.Table('Demandas', metadata,
    db.Column('id', db.Integer(), primary_key=True),
    db.Column('horta_id', db.Integer(), db.ForeignKey('Hortas.id'), nullable=False),
    db.Column('tipo_demanda', db.String(50), nullable=False), # Ex: 'INSUMO', 'INFRAESTRUTURA'
    db.Column('descricao', db.Text, nullable=False), # Ex: "Sementes de tomate", "Mangueira de irrigação"
    db.Column('status', db.String(50)) # Ex: 'ABERTA', 'ATENDIDA'
)

metadata.create_all(engine)
print("Tabelas criadas com sucesso no PostgreSQL")
