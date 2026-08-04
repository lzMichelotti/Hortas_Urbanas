"""Data de calendário no fuso do município — requer TEST_DATABASE_URL."""
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from app.core.config import FUSO, hoje, settings
from app.database.models import Produto

pytestmark = pytest.mark.integration

# 04/08 02h30 em UTC é ainda 03/08 23h30 no município: o momento exato do bug.
INSTANTE_DA_NOITE = datetime(2026, 8, 4, 2, 30, tzinfo=timezone.utc)


class TestFusoDoMunicipio:
    def test_base_de_fusos_disponivel(self):
        """Sem tzdata no sistema nem no pacote, isto levanta ZoneInfoNotFoundError."""
        assert ZoneInfo(settings.TIMEZONE) is not None

    def test_a_noite_o_dia_local_e_o_anterior_ao_utc(self):
        assert INSTANTE_DA_NOITE.date() == date(2026, 8, 4)              # o que gravava antes
        assert INSTANTE_DA_NOITE.astimezone(FUSO).date() == date(2026, 8, 3)  # o dia do horticultor

    def test_hoje_segue_o_fuso_e_nao_o_relogio_do_processo(self):
        assert hoje() == datetime.now(FUSO).date()

    def test_hoje_nunca_adianta_o_dia(self):
        assert hoje() <= datetime.now(timezone.utc).date()


@pytest.fixture
def produto(db):
    p = Produto(nome="Alface", categoria="folhosa", ativo=True)
    db.add(p)
    db.commit()
    return p


@pytest.fixture
def canteiro(client, admin_headers):
    horta = client.post(
        "/hortas", json={"nome": "Horta Fuso", "area_total": 50.0}, headers=admin_headers
    ).json()
    return client.post(
        f"/hortas/{horta['id']}/canteiros",
        json={"identificacao": "Canteiro 1", "numero": 1},
        headers=admin_headers,
    ).json()


def _plantar(client, headers, canteiro, produto, dias_atras=0):
    plantio = hoje() - timedelta(days=dias_atras)
    return client.post(
        f"/canteiros/{canteiro['id']}/ciclos",
        json={
            "produto_id": produto.id,
            "data_plantio": plantio.isoformat(),
            "previsao_colheita": (plantio + timedelta(days=40)).isoformat(),
            "status": "PLANTADO",
        },
        headers=headers,
    )


class TestPlantioComDataEscolhida:
    """O membro escolhe quando plantou: hoje ou dias atrás. Não pode regredir."""

    @pytest.mark.parametrize("dias_atras", [0, 1, 7, 30, 365])
    def test_aceita_plantio_de_hoje_e_de_dias_atras(
        self, client, admin_headers, canteiro, produto, dias_atras
    ):
        r = _plantar(client, admin_headers, canteiro, produto, dias_atras)
        assert r.status_code == 201, r.json()
        assert r.json()["data_plantio"] == (hoje() - timedelta(days=dias_atras)).isoformat()

    def test_colheita_prevista_antes_do_plantio_continua_recusada(
        self, client, admin_headers, canteiro, produto
    ):
        r = client.post(
            f"/canteiros/{canteiro['id']}/ciclos",
            json={
                "produto_id": produto.id,
                "data_plantio": hoje().isoformat(),
                "previsao_colheita": (hoje() - timedelta(days=1)).isoformat(),
                "status": "PLANTADO",
            },
            headers=admin_headers,
        )
        assert r.status_code == 422


class TestDataDaPerda:
    def test_grava_o_dia_do_municipio(self, client, admin_headers, canteiro, produto):
        ciclo = _plantar(client, admin_headers, canteiro, produto, dias_atras=10).json()
        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "GEADA"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["perdido_em"] == hoje().isoformat()

    def test_usa_o_helper_de_fuso_e_nao_o_relogio_utc(
        self, client, admin_headers, canteiro, produto, monkeypatch
    ):
        """Congela o "hoje" local: se o endpoint voltasse a usar UTC, o carimbo
        ignoraria este valor e o teste quebraria."""
        import app.routers.ciclos as rota

        dia_local = date(2026, 8, 3)
        monkeypatch.setattr(rota, "hoje", lambda: dia_local)

        ciclo = _plantar(client, admin_headers, canteiro, produto, dias_atras=60).json()
        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "SECA"},
            headers=admin_headers,
        )
        assert r.json()["perdido_em"] == dia_local.isoformat()

    def test_plantio_futuro_nao_viola_o_check_do_banco(
        self, client, admin_headers, canteiro, produto
    ):
        futuro = hoje() + timedelta(days=5)
        ciclo = client.post(
            f"/canteiros/{canteiro['id']}/ciclos",
            json={
                "produto_id": produto.id,
                "data_plantio": futuro.isoformat(),
                "previsao_colheita": (futuro + timedelta(days=30)).isoformat(),
                "status": "PLANTADO",
            },
            headers=admin_headers,
        ).json()
        r = client.patch(
            f"/ciclos/{ciclo['id']}",
            json={"status": "PERDIDO", "motivo_perda": "GEADA"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["perdido_em"] == futuro.isoformat()


class TestPedirPlantioParaHoje:
    """Em UTC, às 23h o "hoje" do usuário virava passado e o pedido era recusado."""

    def test_data_de_hoje_e_aceita(self, client, admin_headers, canteiro, produto):
        r = client.post(
            f"/canteiros/{canteiro['id']}/solicitacoes",
            json={
                "produto_id": produto.id,
                "quantidade": 2,
                "data_desejada_plantio": hoje().isoformat(),
            },
            headers=admin_headers,
        )
        assert r.status_code == 201, r.json()

    def test_ontem_continua_recusado(self, client, admin_headers, canteiro, produto):
        r = client.post(
            f"/canteiros/{canteiro['id']}/solicitacoes",
            json={
                "produto_id": produto.id,
                "quantidade": 2,
                "data_desejada_plantio": (hoje() - timedelta(days=1)).isoformat(),
            },
            headers=admin_headers,
        )
        assert r.status_code == 422

    def test_a_fronteira_segue_o_dia_local(self, client, admin_headers, canteiro, produto, monkeypatch):
        import app.schemas.solicitacao as schema

        dia_local = hoje() + timedelta(days=3)
        monkeypatch.setattr(schema, "hoje", lambda: dia_local)

        def pedir(data):
            return client.post(
                f"/canteiros/{canteiro['id']}/solicitacoes",
                json={
                    "produto_id": produto.id,
                    "quantidade": 1,
                    "data_desejada_plantio": data.isoformat(),
                },
                headers=admin_headers,
            ).status_code

        assert pedir(dia_local - timedelta(days=1)) == 422
        assert pedir(dia_local) == 201
