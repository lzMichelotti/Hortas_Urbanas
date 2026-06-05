"""Testes de integração do fluxo de autenticação — requer TEST_DATABASE_URL."""
import pytest

from app.core.security import get_password_hash
from app.database.models import Usuario


@pytest.fixture
def usuario_inativo(db):
    u = Usuario(
        nome="Inativo",
        email="inativo@horta-urbana.com",
        cpf="22222222222",
        senha_hash=get_password_hash("senha123"),
        telefone="11888888888",
        privilegio="MEMBRO_CANTEIRO",
        ativo=False,
    )
    db.add(u)
    db.commit()
    return u


class TestLogin:
    def test_login_sucesso_retorna_tokens(self, client, admin_user):
        r = client.post("/token", data={"username": "admin@horta-urbana.com", "password": "senha_admin"})
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert body["token_type"] == "bearer"

    def test_login_senha_errada_retorna_401(self, client, admin_user):
        r = client.post("/token", data={"username": "admin@horta-urbana.com", "password": "errada"})
        assert r.status_code == 401

    def test_login_email_inexistente_retorna_401(self, client):
        r = client.post("/token", data={"username": "naoexiste@horta.test", "password": "qualquer"})
        assert r.status_code == 401

    def test_login_usuario_inativo_retorna_401(self, client, usuario_inativo):
        r = client.post("/token", data={"username": "inativo@horta-urbana.com", "password": "senha123"})
        assert r.status_code == 401

    def test_email_errado_e_senha_errada_retornam_mesmo_erro(self, client, admin_user):
        """Ambos devem retornar 401 com a mesma mensagem — sem vazar qual campo está errado."""
        r_senha = client.post("/token", data={"username": "admin@horta-urbana.com", "password": "errada"})
        r_email = client.post("/token", data={"username": "naoexiste@horta.test", "password": "qualquer"})
        assert r_senha.status_code == r_email.status_code == 401
        assert r_senha.json()["detail"] == r_email.json()["detail"]

    def test_rota_protegida_sem_token_retorna_401(self, client):
        r = client.get("/usuarios/me")
        assert r.status_code == 401

    def test_rota_protegida_com_token_valido(self, client, admin_headers, admin_user):
        r = client.get("/usuarios/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["email"] == "admin@horta-urbana.com"


class TestRefreshToken:
    def test_refresh_retorna_novos_tokens(self, client, admin_user):
        login = client.post("/token", data={"username": "admin@horta-urbana.com", "password": "senha_admin"})
        refresh_token = login.json()["refresh_token"]

        r = client.post("/token/refresh", json={"refresh_token": refresh_token})
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body
        assert "refresh_token" in body

    def test_refresh_token_invalido_retorna_401(self, client):
        r = client.post("/token/refresh", json={"refresh_token": "token.invalido.aqui"})
        assert r.status_code == 401

    def test_access_token_no_lugar_do_refresh_retorna_401(self, client, admin_user):
        """Access token tem type='access' — o endpoint de refresh deve rejeitar."""
        login = client.post("/token", data={"username": "admin@horta-urbana.com", "password": "senha_admin"})
        access_token = login.json()["access_token"]

        r = client.post("/token/refresh", json={"refresh_token": access_token})
        assert r.status_code == 401

    def test_novo_access_token_funciona_em_rota_protegida(self, client, admin_user):
        login = client.post("/token", data={"username": "admin@horta-urbana.com", "password": "senha_admin"})
        refresh_token = login.json()["refresh_token"]

        novo = client.post("/token/refresh", json={"refresh_token": refresh_token})
        novo_access = novo.json()["access_token"]

        r = client.get("/usuarios/me", headers={"Authorization": f"Bearer {novo_access}"})
        assert r.status_code == 200
