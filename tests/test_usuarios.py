"""Testes de integração das rotas de usuários — requer TEST_DATABASE_URL."""
from datetime import datetime, timezone

import pytest
from validate_docbr import CPF

from app.core.security import get_password_hash
from app.database.models import Horta, Usuario

pytestmark = pytest.mark.integration

_cpf = CPF()


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


class TestCriacaoUsuario:
    def _payload(self, cpf, email, privilegio="MEMBRO_CANTEIRO"):
        return {
            "nome": "Novo",
            "email": email,
            "cpf": cpf,
            "telefone": "11999999999",
            "privilegio": privilegio,
        }

    def test_cpf_invalido_retorna_422(self, client, admin_headers):
        r = client.post("/usuarios", json=self._payload("123", "x@horta-urbana.com"), headers=admin_headers)
        assert r.status_code == 422

    def test_cpf_duplicado_retorna_409(self, client, admin_headers):
        cpf = _cpf.generate()
        r1 = client.post("/usuarios", json=self._payload(cpf, "primeiro@horta-urbana.com"), headers=admin_headers)
        assert r1.status_code == 201
        # mesmo CPF, e-mail diferente → conflito na constraint unique de cpf
        r2 = client.post("/usuarios", json=self._payload(cpf, "segundo@horta-urbana.com"), headers=admin_headers)
        assert r2.status_code == 409

    def test_email_duplicado_retorna_409(self, client, admin_headers):
        r1 = client.post("/usuarios", json=self._payload(_cpf.generate(), "repetido@horta-urbana.com"), headers=admin_headers)
        assert r1.status_code == 201
        r2 = client.post("/usuarios", json=self._payload(_cpf.generate(), "repetido@horta-urbana.com"), headers=admin_headers)
        assert r2.status_code == 409


class TestAvatarMe:
    def _headers(self, client, db, horta, email):
        cpf = _cpf.generate()
        _membro(db, horta, email, cpf)
        r = client.post("/token", data={"username": email, "password": cpf})
        assert r.status_code == 200, r.json()
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    def test_avatar_padrao_jardineira(self, client, db, horta):
        h = self._headers(client, db, horta, "av1@horta-urbana.com")
        r = client.get("/usuarios/me", headers=h)
        assert r.status_code == 200
        assert r.json()["avatar"] == "jardineira"

    def test_membro_troca_o_proprio_avatar(self, client, db, horta):
        h = self._headers(client, db, horta, "av2@horta-urbana.com")
        r = client.patch("/usuarios/me", json={"avatar": "idoso"}, headers=h)
        assert r.status_code == 200
        assert r.json()["avatar"] == "idoso"
        assert client.get("/usuarios/me", headers=h).json()["avatar"] == "idoso"

    def test_avatar_muito_longo_422(self, client, db, horta):
        h = self._headers(client, db, horta, "av3@horta-urbana.com")
        r = client.patch("/usuarios/me", json={"avatar": "x" * 31}, headers=h)
        assert r.status_code == 422

    def test_avatar_exige_autenticacao(self, client):
        r = client.patch("/usuarios/me", json={"avatar": "idoso"})
        assert r.status_code == 401


class TestDadosHorticultor:
    def _headers(self, client, db, horta, email):
        cpf = _cpf.generate()
        _membro(db, horta, email, cpf)
        r = client.post("/token", data={"username": email, "password": cpf})
        assert r.status_code == 200, r.json()
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    def test_membro_novo_nasce_sem_dados_informados(self, client, db, horta):
        h = self._headers(client, db, horta, "dh1@horta-urbana.com")
        corpo = client.get("/usuarios/me", headers=h).json()
        assert corpo["nascimento_ano"] is None
        assert corpo["sexo"] is None
        assert corpo["raca_cor"] is None
        assert corpo["grupo_familiar"] is None
        assert corpo["idade"] is None

    def test_lider_informa_os_dados_ao_cadastrar(self, client, lider_headers):
        r = client.post(
            "/usuarios",
            json={
                "nome": "Maria",
                "email": "dh2@horta-urbana.com",
                "cpf": _cpf.generate(),
                "telefone": "11999999999",
                "privilegio": "MEMBRO_CANTEIRO",
                "nascimento_ano": 1955,
                "sexo": "FEMININO",
                "raca_cor": "PARDA",
                "grupo_familiar": 4,
            },
            headers=lider_headers,
        )
        assert r.status_code == 201, r.json()
        corpo = r.json()
        assert corpo["nascimento_ano"] == 1955
        assert corpo["sexo"] == "FEMININO"
        assert corpo["raca_cor"] == "PARDA"
        assert corpo["grupo_familiar"] == 4
        assert corpo["idade"] == datetime.now(timezone.utc).year - 1955

    def test_dono_edita_os_proprios_dados(self, client, db, horta):
        h = self._headers(client, db, horta, "dh3@horta-urbana.com")
        r = client.patch(
            "/usuarios/me",
            json={"nascimento_ano": 1960, "sexo": "MASCULINO", "raca_cor": "PRETA", "grupo_familiar": 2},
            headers=h,
        )
        assert r.status_code == 200, r.json()
        assert client.get("/usuarios/me", headers=h).json()["raca_cor"] == "PRETA"

    def test_patch_parcial_nao_apaga_o_resto(self, client, db, horta):
        h = self._headers(client, db, horta, "dh4@horta-urbana.com")
        client.patch("/usuarios/me", json={"sexo": "FEMININO", "grupo_familiar": 3}, headers=h)
        client.patch("/usuarios/me", json={"avatar": "idoso"}, headers=h)
        corpo = client.get("/usuarios/me", headers=h).json()
        assert corpo["avatar"] == "idoso"
        assert corpo["sexo"] == "FEMININO"
        assert corpo["grupo_familiar"] == 3

    def test_null_explicito_volta_a_nao_informado(self, client, db, horta):
        h = self._headers(client, db, horta, "dh5@horta-urbana.com")
        client.patch("/usuarios/me", json={"raca_cor": "BRANCA"}, headers=h)
        r = client.patch("/usuarios/me", json={"raca_cor": None}, headers=h)
        assert r.status_code == 200
        assert client.get("/usuarios/me", headers=h).json()["raca_cor"] is None

    def test_avatar_nulo_nao_derruba_a_coluna(self, client, db, horta):
        h = self._headers(client, db, horta, "dh6@horta-urbana.com")
        r = client.patch("/usuarios/me", json={"avatar": None}, headers=h)
        assert r.status_code == 422
        assert client.get("/usuarios/me", headers=h).json()["avatar"] == "jardineira"

    @pytest.mark.parametrize(
        "corpo",
        [
            {"nascimento_ano": 1800},
            {"nascimento_ano": 2400},
            {"sexo": "NAO_SEI"},
            {"raca_cor": "OUTRA"},
            {"grupo_familiar": 0},
            {"grupo_familiar": 31},
        ],
    )
    def test_valores_fora_do_esperado_dao_422(self, client, db, horta, corpo):
        h = self._headers(client, db, horta, f"dh-{abs(hash(str(corpo)))}@horta-urbana.com")
        assert client.patch("/usuarios/me", json=corpo, headers=h).status_code == 422

    def test_listagem_nao_expoe_dado_sensivel(self, client, lider_headers):
        r = client.post(
            "/usuarios",
            json={
                "nome": "Joao",
                "email": "dh7@horta-urbana.com",
                "cpf": _cpf.generate(),
                "telefone": "11999999999",
                "privilegio": "MEMBRO_CANTEIRO",
                "raca_cor": "INDIGENA",
                "nascimento_ano": 1970,
            },
            headers=lider_headers,
        )
        assert r.status_code == 201, r.json()
        lista = client.get("/usuarios", headers=lider_headers).json()
        assert lista
        for u in lista:
            assert "raca_cor" not in u
            assert "nascimento_ano" not in u
            assert "sexo" not in u
            assert "grupo_familiar" not in u
