"""Previsão de entrega e a visão de todos os pedidos pela administração."""
from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import hoje
from app.database.models import Demanda, Horta, SolicitacaoPlantio
from tests.test_demandas import (  # noqa: F401 — fixtures
    horta, lider_headers, membro, membro_headers, pedido, pedido_planta, produto,
)

pytestmark = pytest.mark.integration


def _aprovar_planta(client, headers, id, **extra):
    return client.patch(
        f"/solicitacoes/{id}/status", json={"status": "EM_ATENDIMENTO", **extra}, headers=headers
    )


def _aprovar_material(client, headers, horta_id, id, **extra):
    return client.patch(
        f"/hortas/{horta_id}/demandas/{id}/status",
        json={"status": "EM_ATENDIMENTO", **extra},
        headers=headers,
    )


class TestPrevisaoDeEntrega:
    def test_lider_aprova_com_previsao_e_o_membro_ve(
        self, client, lider_headers, membro, membro_headers, pedido_planta
    ):
        data = (hoje() + timedelta(days=3)).isoformat()
        r = _aprovar_planta(client, lider_headers, pedido_planta["id"], previsao_entrega=data)
        assert r.status_code == 200, r.json()

        do_membro = client.get(
            f"/canteiros/{membro['canteiro'].id}/solicitacoes", headers=membro_headers
        ).json()
        assert do_membro[0]["previsao_entrega"] == data

    def test_aprovar_sem_previsao_e_permitido(self, client, lider_headers, horta, pedido):
        r = _aprovar_material(client, lider_headers, horta.id, pedido["id"])
        assert r.status_code == 200
        assert r.json()["previsao_entrega"] is None

    def test_mudar_so_o_status_mantem_a_previsao(self, client, lider_headers, horta, pedido):
        data = (hoje() + timedelta(days=7)).isoformat()
        _aprovar_material(client, lider_headers, horta.id, pedido["id"], previsao_entrega=data)
        r = client.patch(
            f"/hortas/{horta.id}/demandas/{pedido['id']}/status",
            json={"status": "ATENDIDA"},
            headers=lider_headers,
        )
        assert r.json()["previsao_entrega"] == data

    def test_previsao_no_passado_e_recusada(self, client, lider_headers, pedido_planta):
        ontem = (hoje() - timedelta(days=1)).isoformat()
        r = _aprovar_planta(client, lider_headers, pedido_planta["id"], previsao_entrega=ontem)
        assert r.status_code == 422

    def test_admin_define_previsao_de_qualquer_horta(
        self, client, admin_headers, horta, pedido
    ):
        data = hoje().isoformat()
        r = _aprovar_material(client, admin_headers, horta.id, pedido["id"], previsao_entrega=data)
        assert r.status_code == 200
        assert r.json()["previsao_entrega"] == data


class TestPedidosDoAdmin:
    def test_lista_os_dois_tipos_com_quem_pediu(
        self, client, admin_headers, horta, pedido, pedido_planta
    ):
        lista = client.get("/painel/admin/pedidos", headers=admin_headers).json()
        por_tipo = {p["tipo"]: p for p in lista}
        assert set(por_tipo) == {"PLANTA", "MATERIAL"}
        for p in lista:
            assert p["horta_id"] == horta.id
            assert p["solicitante"] == "Membro"
            assert p["canteiro_numero"] == 1
            assert p["encaminhada"] is False
            assert p["atraso"] is None
        assert por_tipo["PLANTA"]["observacao"] == "Quero plantar"
        assert por_tipo["MATERIAL"]["unidade"] == "sacos"

    def test_pedido_do_lider_para_a_horta_vem_sem_solicitante(
        self, client, admin_headers, lider_headers, horta
    ):
        client.post(
            f"/hortas/{horta.id}/demandas",
            json={"tipo_demanda": "x", "descricao": "Mangueira", "quantidade": 1, "unidade_medida": "un"},
            headers=lider_headers,
        )
        (p,) = client.get("/painel/admin/pedidos", headers=admin_headers).json()
        assert p["solicitante"] is None and p["canteiro_numero"] is None

    def test_sem_resposta_ha_mais_de_dois_dias_e_atrasado(
        self, client, admin_headers, db, pedido, pedido_planta
    ):
        tres_dias = datetime.now(timezone.utc) - timedelta(days=3)
        db.query(Demanda).filter(Demanda.id == pedido["id"]).update({"criado_em": tres_dias})
        db.commit()
        atraso = {p["tipo"]: p["atraso"] for p in client.get("/painel/admin/pedidos", headers=admin_headers).json()}
        assert atraso == {"MATERIAL": "SEM_RESPOSTA", "PLANTA": None}

    def test_previsao_vencida_e_atrasado(self, client, admin_headers, lider_headers, db, pedido_planta):
        _aprovar_planta(client, lider_headers, pedido_planta["id"])
        db.query(SolicitacaoPlantio).filter(SolicitacaoPlantio.id == pedido_planta["id"]).update(
            {"previsao_entrega": hoje() - timedelta(days=1)}
        )
        db.commit()
        (p,) = client.get("/painel/admin/pedidos", headers=admin_headers).json()
        assert p["atraso"] == "PREVISAO_VENCIDA"

    def test_marca_o_repassado(self, client, admin_headers, lider_headers, pedido_planta):
        client.patch(
            f"/solicitacoes/{pedido_planta['id']}/encaminhamento",
            json={"encaminhada": True},
            headers=lider_headers,
        )
        (p,) = client.get("/painel/admin/pedidos", headers=admin_headers).json()
        assert p["encaminhada"] is True

    def test_ignora_horta_removida(self, client, admin_headers, db, horta, pedido):
        db.query(Horta).filter(Horta.id == horta.id).update({"ativo": False})
        db.commit()
        assert client.get("/painel/admin/pedidos", headers=admin_headers).json() == []

    def test_lider_nao_acessa(self, client, lider_headers):
        assert client.get("/painel/admin/pedidos", headers=lider_headers).status_code == 403
