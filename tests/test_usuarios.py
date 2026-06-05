"""Testes de integração das rotas de usuários — requer TEST_DATABASE_URL."""
import pytest

from app.core.security import get_password_hash
from app.database.models import Horta, Usuario


@pytest.fixture
def horta(db):
    h = Horta(nome="Horta A", area_total=100.0, ativo=True)
    db.add(h)
    db.commit()
    return h


@pytest.fixture
def lider(db, horta):
    u = Usuario(
        nome="Líder A",
        email="lider@horta-urbana.com",
        cpf="33333333333",
        senha_hash=get_password_hash("33333333333"),
        telefone="11777777777",
        privilegio="LIDER_HORTA",
        horta_id=horta.id,
        ativo=True,
    )
    db.add(u)
    db.commit()
    return u


@pytest.fixture
def lider_headers(client, lider):
    r = client.post("/token", data={"username": "lider@horta-urbana.com", "password": "33333333333"})
    assert r.status_code == 200, f"Login do líder falhou: {r.json()}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _membro(db, horta, email, cpf):
    u = Usuario(
        nome="Membro",
        email=email,
        cpf=cpf,
        senha_hash=get_password_hash(cpf),
        telefone="11666666666",
        privilegio="MEMBRO_CANTEIRO",
        horta_id=horta.id,
        ativo=True,
    )
    db.add(u)
    db.commit()
    return u


class TestEscalonamentoDePrivilegio:
    def test_lider_nao_pode_se_promover_a_admin(self, client, lider, lider_headers):
        r = client.patch(
            f"/usuarios/{lider.id}",
            json={"privilegio": "ADMIN_SUPREMO"},
            headers=lider_headers,
        )
        assert r.status_code == 403

    def test_lider_nao_pode_promover_membro_a_lider(self, client, db, horta, lider_headers):
        membro = _membro(db, horta, "membro@horta-urbana.com", "44444444444")
        r = client.patch(
            f"/usuarios/{membro.id}",
            json={"privilegio": "LIDER_HORTA"},
            headers=lider_headers,
        )
        assert r.status_code == 403

    def test_lider_nao_pode_mover_usuario_para_outra_horta(self, client, db, horta, lider_headers):
        membro = _membro(db, horta, "membro2@horta-urbana.com", "55555555555")
        r = client.patch(
            f"/usuarios/{membro.id}",
            json={"horta_id": horta.id + 999},
            headers=lider_headers,
        )
        assert r.status_code == 403

    def test_lider_pode_editar_dado_comum_do_membro(self, client, db, horta, lider_headers):
        membro = _membro(db, horta, "membro3@horta-urbana.com", "66666666666")
        r = client.patch(
            f"/usuarios/{membro.id}",
            json={"nome": "Nome Novo"},
            headers=lider_headers,
        )
        assert r.status_code == 200
        assert r.json()["nome"] == "Nome Novo"
