"""Testes de integração do encaminhamento de demanda à administração — requer TEST_DATABASE_URL."""
import pytest

from app.core.security import get_password_hash
from app.database.models import Canteiro, Horta, Usuario

pytestmark = pytest.mark.integration


def _usuario(db, *, nome, email, cpf, privilegio, horta_id):
    u = Usuario(
        nome=nome,
        email=email,
        cpf=cpf,
        senha_hash=get_password_hash(cpf),
        telefone="11999990000",
        privilegio=privilegio,
        horta_id=horta_id,
        ativo=True,
    )
    db.add(u)
    db.commit()
    return u


@pytest.fixture
def horta(db):
    h = Horta(nome="Horta do Encaminhamento", area_total=100.0, ativo=True)
    db.add(h)
    db.commit()
    return h


@pytest.fixture
def membro(db, horta):
    membro = _usuario(
        db, nome="Membro", email="membro@e.com", cpf="20000000001",
        privilegio="MEMBRO_CANTEIRO", horta_id=horta.id,
    )
    canteiro = Canteiro(
        horta_id=horta.id, usuario_id=membro.id, identificacao="C1", numero=1, ativo=True
    )
    db.add(canteiro)
    db.commit()
    return {"usuario": membro, "canteiro": canteiro}


@pytest.fixture
def membro_headers(client, membro):
    r = client.post("/token", data={"username": "membro@e.com", "password": "20000000001"})
    assert r.status_code == 200, r.json()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def lider_headers(client, db, horta):
    _usuario(
        db, nome="Líder", email="lider@e.com", cpf="20000000002",
        privilegio="LIDER_HORTA", horta_id=horta.id,
    )
    r = client.post("/token", data={"username": "lider@e.com", "password": "20000000002"})
    assert r.status_code == 200, r.json()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def pedido(client, membro, membro_headers):
    r = client.post(
        f"/canteiros/{membro['canteiro'].id}/demandas",
        json={
            "tipo_demanda": "material",
            "descricao": "Adubo para o canteiro",
            "quantidade": 2,
            "unidade_medida": "sacos",
        },
        headers=membro_headers,
    )
    assert r.status_code == 201, r.json()
    return r.json()


def _encaminhar(client, headers, horta_id, demanda_id, encaminhada=True):
    return client.patch(
        f"/hortas/{horta_id}/demandas/{demanda_id}/encaminhamento",
        json={"encaminhada": encaminhada},
        headers=headers,
    )


class TestEncaminharAoAdmin:
    def test_admin_ve_o_pedido_do_membro_mesmo_sem_encaminhar(
        self, client, admin_headers, pedido
    ):
        fila = client.get("/demandas", headers=admin_headers).json()
        assert [d["id"] for d in fila] == [pedido["id"]]
        assert fila[0]["encaminhada_em"] is None

    def test_lider_encaminha_e_o_admin_passa_a_ver(
        self, client, admin_headers, lider_headers, horta, pedido
    ):
        r = _encaminhar(client, lider_headers, horta.id, pedido["id"])
        assert r.status_code == 200, r.json()
        assert r.json()["encaminhada_em"] is not None

        fila = client.get("/demandas", headers=admin_headers).json()
        assert [d["id"] for d in fila] == [pedido["id"]]
        assert fila[0]["canteiro_id"] == pedido["canteiro_id"]

    def test_encaminhar_de_novo_mantem_a_data_original(
        self, client, lider_headers, horta, pedido
    ):
        primeira = _encaminhar(client, lider_headers, horta.id, pedido["id"]).json()
        segunda = _encaminhar(client, lider_headers, horta.id, pedido["id"]).json()
        assert segunda["encaminhada_em"] == primeira["encaminhada_em"]

    def test_lider_desfaz_o_encaminhamento(
        self, client, admin_headers, lider_headers, horta, pedido
    ):
        _encaminhar(client, lider_headers, horta.id, pedido["id"])
        r = _encaminhar(client, lider_headers, horta.id, pedido["id"], encaminhada=False)
        assert r.status_code == 200
        assert r.json()["encaminhada_em"] is None
        fila = client.get("/demandas", headers=admin_headers).json()
        assert [d["encaminhada_em"] for d in fila] == [None]

    def test_o_pedido_continua_com_o_lider_depois_de_encaminhado(
        self, client, lider_headers, horta, pedido
    ):
        _encaminhar(client, lider_headers, horta.id, pedido["id"])
        do_lider = client.get("/demandas", headers=lider_headers).json()
        assert [d["id"] for d in do_lider] == [pedido["id"]]

    def test_status_e_o_mesmo_registro_nas_duas_telas(
        self, client, admin_headers, lider_headers, horta, pedido
    ):
        _encaminhar(client, lider_headers, horta.id, pedido["id"])
        client.patch(
            f"/hortas/{horta.id}/demandas/{pedido['id']}/status",
            json={"status": "EM_ATENDIMENTO"},
            headers=admin_headers,
        )
        do_lider = client.get("/demandas", headers=lider_headers).json()[0]
        assert do_lider["status"] == "EM_ATENDIMENTO"

    def test_pedido_da_propria_horta_nao_se_encaminha(
        self, client, lider_headers, horta
    ):
        demanda = client.post(
            f"/hortas/{horta.id}/demandas",
            json={
                "tipo_demanda": "material",
                "descricao": "Terra adubada",
                "quantidade": 5,
                "unidade_medida": "sacos",
            },
            headers=lider_headers,
        ).json()
        r = _encaminhar(client, lider_headers, horta.id, demanda["id"])
        assert r.status_code == 400

    def test_pedido_encerrado_nao_se_encaminha(self, client, lider_headers, horta, pedido):
        client.patch(
            f"/hortas/{horta.id}/demandas/{pedido['id']}/status",
            json={"status": "CANCELADA"},
            headers=lider_headers,
        )
        r = _encaminhar(client, lider_headers, horta.id, pedido["id"])
        assert r.status_code == 400

    def test_membro_nao_encaminha_o_proprio_pedido(
        self, client, membro_headers, horta, pedido
    ):
        assert _encaminhar(client, membro_headers, horta.id, pedido["id"]).status_code == 403

    def test_lider_de_outra_horta_nao_encaminha(self, client, db, horta, pedido):
        outra = Horta(nome="Outra Horta", area_total=10.0, ativo=True)
        db.add(outra)
        db.commit()
        _usuario(
            db, nome="Líder de fora", email="fora@e.com", cpf="20000000003",
            privilegio="LIDER_HORTA", horta_id=outra.id,
        )
        r = client.post("/token", data={"username": "fora@e.com", "password": "20000000003"})
        headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
        assert _encaminhar(client, headers, horta.id, pedido["id"]).status_code == 403

    def test_panorama_conta_o_pedido_desde_que_e_criado(self, client, admin_headers, pedido):
        body = client.get("/painel/admin/panorama", headers=admin_headers).json()
        assert body["demandas"]["abertas"] == 1


class TestListaLimitada:
    def _encerrar(self, client, headers, horta_id, demanda_id):
        client.patch(
            f"/hortas/{horta_id}/demandas/{demanda_id}/status",
            json={"status": "ATENDIDA"},
            headers=headers,
        )

    def test_abertos_sempre_voltam_historico_e_cortado(
        self, client, membro, membro_headers, lider_headers, horta
    ):
        from app.routers.demandas import LIMITE_HISTORICO

        canteiro_id = membro["canteiro"].id
        encerradas = []
        for i in range(LIMITE_HISTORICO + 8):
            d = client.post(
                f"/canteiros/{canteiro_id}/demandas",
                json={
                    "tipo_demanda": "material",
                    "descricao": f"Pedido {i}",
                    "quantidade": 1,
                    "unidade_medida": "un",
                },
                headers=membro_headers,
            ).json()
            self._encerrar(client, lider_headers, horta.id, d["id"])
            encerradas.append(d["id"])

        abertas = [
            client.post(
                f"/canteiros/{canteiro_id}/demandas",
                json={
                    "tipo_demanda": "material",
                    "descricao": f"Aberta {i}",
                    "quantidade": 1,
                    "unidade_medida": "un",
                },
                headers=membro_headers,
            ).json()["id"]
            for i in range(3)
        ]

        lista = client.get("/demandas", headers=lider_headers).json()
        ids = [d["id"] for d in lista]

        assert set(abertas).issubset(ids)
        assert len(lista) == len(abertas) + LIMITE_HISTORICO
        assert set(encerradas[-LIMITE_HISTORICO:]).issubset(ids)
        assert encerradas[0] not in ids

    def test_lista_do_canteiro_tambem_e_limitada(
        self, client, membro, membro_headers, lider_headers, horta
    ):
        from app.routers.demandas import LIMITE_HISTORICO

        canteiro_id = membro["canteiro"].id
        for i in range(LIMITE_HISTORICO + 5):
            d = client.post(
                f"/canteiros/{canteiro_id}/demandas",
                json={
                    "tipo_demanda": "material",
                    "descricao": f"Pedido {i}",
                    "quantidade": 1,
                    "unidade_medida": "un",
                },
                headers=membro_headers,
            ).json()
            self._encerrar(client, lider_headers, horta.id, d["id"])

        lista = client.get(f"/canteiros/{canteiro_id}/demandas", headers=membro_headers).json()
        assert len(lista) == LIMITE_HISTORICO

    def test_revisita_sem_mudanca_devolve_304(self, client, lider_headers, pedido):
        primeira = client.get("/demandas", headers=lider_headers)
        etag = primeira.headers["ETag"]
        segunda = client.get("/demandas", headers={**lider_headers, "If-None-Match": etag})
        assert segunda.status_code == 304

    def test_responder_muda_o_etag(self, client, lider_headers, horta, pedido):
        etag = client.get("/demandas", headers=lider_headers).headers["ETag"]
        client.patch(
            f"/hortas/{horta.id}/demandas/{pedido['id']}/status",
            json={"status": "EM_ATENDIMENTO"},
            headers=lider_headers,
        )
        depois = client.get("/demandas", headers={**lider_headers, "If-None-Match": etag})
        assert depois.status_code == 200


@pytest.fixture
def produto(db):
    from app.database.models import Produto

    p = Produto(nome="Alface", categoria="folhosa", ativo=True)
    db.add(p)
    db.commit()
    return p


@pytest.fixture
def pedido_planta(client, membro, membro_headers, produto):
    r = client.post(
        f"/canteiros/{membro['canteiro'].id}/solicitacoes",
        json={"produto_id": produto.id, "quantidade": 3, "justificativa": "Quero plantar"},
        headers=membro_headers,
    )
    assert r.status_code == 201, r.json()
    return r.json()


def _encaminhar_planta(client, headers, solicitacao_id, encaminhada=True):
    return client.patch(
        f"/solicitacoes/{solicitacao_id}/encaminhamento",
        json={"encaminhada": encaminhada},
        headers=headers,
    )


class TestEncaminharPlantaAoAdmin:
    def test_admin_ve_a_planta_mesmo_sem_encaminhar(self, client, admin_headers, pedido_planta):
        fila = client.get("/solicitacoes", headers=admin_headers).json()
        assert [s["id"] for s in fila] == [pedido_planta["id"]]

    def test_lider_encaminha_e_o_admin_ve(
        self, client, admin_headers, lider_headers, pedido_planta
    ):
        r = _encaminhar_planta(client, lider_headers, pedido_planta["id"])
        assert r.status_code == 200, r.json()
        assert r.json()["encaminhada_em"] is not None

        fila = client.get("/solicitacoes", headers=admin_headers).json()
        assert [s["id"] for s in fila] == [pedido_planta["id"]]

    def test_desfazer_tira_so_o_destaque_de_repassado(
        self, client, admin_headers, lider_headers, pedido_planta
    ):
        _encaminhar_planta(client, lider_headers, pedido_planta["id"])
        _encaminhar_planta(client, lider_headers, pedido_planta["id"], encaminhada=False)
        fila = client.get("/solicitacoes", headers=admin_headers).json()
        assert [s["encaminhada_em"] for s in fila] == [None]

    def test_encaminhar_de_novo_mantem_a_data(self, client, lider_headers, pedido_planta):
        primeira = _encaminhar_planta(client, lider_headers, pedido_planta["id"]).json()
        segunda = _encaminhar_planta(client, lider_headers, pedido_planta["id"]).json()
        assert segunda["encaminhada_em"] == primeira["encaminhada_em"]

    def test_planta_encerrada_nao_se_encaminha(self, client, lider_headers, pedido_planta):
        client.patch(
            f"/solicitacoes/{pedido_planta['id']}/status",
            json={"status": "CANCELADA"},
            headers=lider_headers,
        )
        assert _encaminhar_planta(client, lider_headers, pedido_planta["id"]).status_code == 400

    def test_membro_nao_encaminha(self, client, membro_headers, pedido_planta):
        assert _encaminhar_planta(client, membro_headers, pedido_planta["id"]).status_code == 403

    def test_lider_continua_vendo_o_pedido_encaminhado(
        self, client, lider_headers, pedido_planta
    ):
        _encaminhar_planta(client, lider_headers, pedido_planta["id"])
        do_lider = client.get("/solicitacoes", headers=lider_headers).json()
        assert [s["id"] for s in do_lider] == [pedido_planta["id"]]

    def test_panorama_conta_a_planta_desde_que_e_criada(self, client, admin_headers, pedido_planta):
        body = client.get("/painel/admin/panorama", headers=admin_headers).json()
        assert body["demandas"]["abertas"] == 1
