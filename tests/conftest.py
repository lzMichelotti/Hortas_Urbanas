import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import app.database.models  # noqa: F401 — registra todos os models no Base.metadata
from app.core.security import get_password_hash
from app.database.models import Usuario
from app.database.session import Base, get_db
from app.main import app

_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture(scope="session")
def test_engine():
    if not _TEST_DB_URL:
        pytest.skip(
            "TEST_DATABASE_URL não definida — defina para rodar testes de integração. "
            "Ex: TEST_DATABASE_URL=postgresql://horta:horta1234@localhost:5435/horta_test"
        )
    engine = create_engine(_TEST_DB_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def db(test_engine):
    Session = sessionmaker(
        bind=test_engine, autocommit=False, autoflush=False, expire_on_commit=False
    )
    session = Session()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        # TRUNCATE CASCADE limpa todas as tabelas e reseta sequences entre testes.
        # Aspas duplas necessárias — nomes como "Hortas" e "Usuarios" são case-sensitive.
        table_names = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
        with test_engine.connect() as conn:
            conn.execute(text(f"TRUNCATE {table_names} RESTART IDENTITY CASCADE"))
            conn.commit()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    u = Usuario(
        nome="Admin Teste",
        email="admin@horta-urbana.com",
        cpf="11111111111",
        senha_hash=get_password_hash("senha_admin"),
        telefone="11999999999",
        privilegio="ADMIN_SUPREMO",
        ativo=True,
    )
    db.add(u)
    db.commit()
    return u


@pytest.fixture
def admin_headers(client, admin_user):
    r = client.post("/token", data={"username": "admin@horta-urbana.com", "password": "senha_admin"})
    assert r.status_code == 200, f"Login do admin falhou: {r.json()}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
