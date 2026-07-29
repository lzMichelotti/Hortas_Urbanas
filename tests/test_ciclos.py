"""Testes de integração do registro de perda de ciclo — requer TEST_DATABASE_URL."""
from datetime import date, timedelta

import pytest
from sqlalchemy import text
from validate_docbr import CPF

from app.database.models import Produto

pytestmark = pytest.mark.integration


@pytest.fixture
def ciclo(client, db, admin_headers):
    horta = client.post(
        "/hortas", json={"nome": "Horta Ciclos", "area_total": 50.0}, headers=admin_headers
    ).json()

    canteiro = client.post(
        f"/hortas/{horta['id']}/canteiros",
        json={"identificacao": "Canteiro 1"},
        headers=admin_headers,
    ).json()

    produto = Produto(nome="Alface", categoria="folhosa", ativo=True)
    db.add(produto)
    db.commit()

    hoje = date.today()
    r = client.post(
        f"/canteiros/{canteiro['id']}/ciclos",
        json={
            "produto_id": produto.id,
            "data_plantio": (hoje - timedelta(days=10)).isoformat(),
            "previsao_colheita": (hoje + timedelta(days=20)).isoformat(),
            "status": "PLANTADO",
        },
        headers=admin_headers,
    )
    assert r.status_code == 201, r.json()
    return r.json()


class TestMotivoDaPerda:
    def test_perder_com_motivo_grava_data_no_servidor(self, client, admin_headers, ciclo):
        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "GEADA"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["motivo_perda"] == "GEADA"
        assert body["perdido_em"] == date.today().isoformat()

    def test_perder_sem_motivo_retorna_422(self, client, admin_headers, ciclo):
        r = client.patch(
            f"/ciclos/{ciclo['id']}", json={"status": "PERDIDO"}, headers=admin_headers
        )
        assert r.status_code == 422

    def test_motivo_sem_status_perdido_retorna_422(self, client, admin_headers, ciclo):
        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "EM_CRESCIMENTO", "motivo_perda": "GEADA"},
            headers=admin_headers,
        )
        assert r.status_code == 422

    def test_observacao_exige_motivo_outro(self, client, admin_headers, ciclo):
        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "PRAGA", "observacao_perda": "formiga"},
            headers=admin_headers,
        )
        assert r.status_code == 422

    def test_observacao_com_motivo_outro(self, client, admin_headers, ciclo):
        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "OUTRO", "observacao_perda": "pisaram"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["observacao_perda"] == "pisaram"

    def test_corrigir_motivo_preserva_data_da_perda(self, client, db, admin_headers, ciclo):
        client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "GEADA"},
            headers=admin_headers,
        )
        ontem = date.today() - timedelta(days=1)
        db.execute(
            text('UPDATE "Ciclos_Producao" SET perdido_em = :d WHERE id = :i'),
            {"d": ontem, "i": ciclo["id"]},
        )
        db.commit()

        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "ANIMAIS"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["motivo_perda"] == "ANIMAIS"
        assert r.json()["perdido_em"] == ontem.isoformat()

    def test_sair_de_perdido_limpa_dados_da_perda(self, client, admin_headers, ciclo):
        client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "OUTRO", "observacao_perda": "engano"},
            headers=admin_headers,
        )
        r = client.patch(
            f"/ciclos/{ciclo['id']}", json={"status": "EM_CRESCIMENTO"}, headers=admin_headers
        )
        assert r.status_code == 200
        body = r.json()
        assert body["motivo_perda"] is None
        assert body["observacao_perda"] is None
        assert body["perdido_em"] is None

    def test_motivo_invalido_retorna_422(self, client, admin_headers, ciclo):
        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "METEORO"},
            headers=admin_headers,
        )
        assert r.status_code == 422


@pytest.fixture
def lider_com_canteiro(client, db, admin_headers):
    """Líder que também cuida de um canteiro seu, como qualquer membro da horta."""
    horta = client.post(
        "/hortas", json={"nome": "Horta do Líder", "area_total": 30.0}, headers=admin_headers
    ).json()

    cpf = CPF().generate()
    email = "lider.canteiro@horta-urbana.com"
    lider = client.post(
        "/usuarios",
        json={
            "nome": "Líder Teste",
            "email": email,
            "cpf": cpf,
            "telefone": "11988888888",
            "privilegio": "LIDER_HORTA",
            "horta_id": horta["id"],
        },
        headers=admin_headers,
    ).json()

    token = client.post("/token", data={"username": email, "password": cpf}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(
        f"/hortas/{horta['id']}/canteiros",
        json={"identificacao": "Canteiro do Líder", "usuario_id": lider["id"]},
        headers=headers,
    )
    assert r.status_code == 201, r.json()

    produto = Produto(nome="Cenoura", categoria="raiz", ativo=True)
    db.add(produto)
    db.commit()

    return {"lider": lider, "headers": headers, "canteiro": r.json(), "produto_id": produto.id}


class TestCanteiroDoLider:
    def test_lider_pode_ser_responsavel_pelo_proprio_canteiro(self, lider_com_canteiro):
        assert lider_com_canteiro["canteiro"]["usuario_id"] == lider_com_canteiro["lider"]["id"]

    def test_lider_planta_no_proprio_canteiro(self, client, lider_com_canteiro):
        hoje = date.today()
        r = client.post(
            f"/canteiros/{lider_com_canteiro['canteiro']['id']}/ciclos",
            json={
                "produto_id": lider_com_canteiro["produto_id"],
                "data_plantio": hoje.isoformat(),
                "previsao_colheita": (hoje + timedelta(days=60)).isoformat(),
                "status": "PLANTADO",
            },
            headers=lider_com_canteiro["headers"],
        )
        assert r.status_code == 201, r.json()

    def test_canteiro_do_lider_aparece_na_listagem_da_horta(self, client, lider_com_canteiro):
        r = client.get("/canteiros", headers=lider_com_canteiro["headers"])
        assert r.status_code == 200
        meus = [c for c in r.json() if c["usuario_id"] == lider_com_canteiro["lider"]["id"]]
        assert len(meus) == 1
        assert meus[0]["identificacao"] == "Canteiro do Líder"
