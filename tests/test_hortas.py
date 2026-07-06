"""Testes de integração das rotas de hortas e PostGIS — requer TEST_DATABASE_URL."""
import pytest
from validate_docbr import CPF

from app.database.models import ZonaRisco

pytestmark = pytest.mark.integration

_cpf = CPF()

# Ponto de referência: Centro de São Paulo
_SP_LAT = -23.5505
_SP_LNG = -46.6333

# Polígono pequeno que cobre o ponto de referência (~0.01 grau ≈ 1km)
_POLIGONO_COBRE_SP = (
    "SRID=4326;POLYGON(("
    "-46.64 -23.56,"
    "-46.62 -23.56,"
    "-46.62 -23.54,"
    "-46.64 -23.54,"
    "-46.64 -23.56"
    "))"
)

# Polígono distante (Rio de Janeiro) — não cobre SP
_POLIGONO_RJ = (
    "SRID=4326;POLYGON(("
    "-43.20 -22.92,"
    "-43.18 -22.92,"
    "-43.18 -22.90,"
    "-43.20 -22.90,"
    "-43.20 -22.92"
    "))"
)


@pytest.fixture
def horta_sp(client, admin_headers):
    r = client.post(
        "/hortas",
        json={"nome": "Horta SP", "area_total": 100.0, "latitude": _SP_LAT, "longitude": _SP_LNG},
        headers=admin_headers,
    )
    assert r.status_code == 201
    return r.json()


@pytest.fixture
def zona_ativa_cobre_sp(db):
    z = ZonaRisco(
        nome="Zona Alagamento SP",
        tipo="alagamento",
        nivel="alto",
        area=_POLIGONO_COBRE_SP,
        ativa=True,
    )
    db.add(z)
    db.commit()
    return z


class TestHortasCRUD:
    def test_listar_hortas_retorna_lista_vazia(self, client):
        r = client.get("/hortas")
        assert r.status_code == 200
        assert r.json() == []

    def test_criar_horta_com_localizacao(self, client, admin_headers):
        r = client.post(
            "/hortas",
            json={"nome": "Horta GPS", "area_total": 120.0, "latitude": _SP_LAT, "longitude": _SP_LNG},
            headers=admin_headers,
        )
        assert r.status_code == 201
        body = r.json()
        assert body["nome"] == "Horta GPS"
        assert body["latitude"] == pytest.approx(_SP_LAT, abs=1e-4)
        assert body["longitude"] == pytest.approx(_SP_LNG, abs=1e-4)
        assert "Location" in r.headers

    def test_criar_horta_sem_localizacao(self, client, admin_headers):
        r = client.post("/hortas", json={"nome": "Sem GPS", "area_total": 50.0}, headers=admin_headers)
        assert r.status_code == 201
        body = r.json()
        assert body["latitude"] is None
        assert body["longitude"] is None

    def test_criar_horta_sem_auth_retorna_401(self, client):
        r = client.post("/hortas", json={"nome": "Sem Auth", "area_total": 10.0})
        assert r.status_code == 401

    def test_buscar_horta_por_id(self, client, horta_sp):
        r = client.get(f"/hortas/{horta_sp['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == horta_sp["id"]

    def test_buscar_horta_inexistente_retorna_404(self, client):
        r = client.get("/hortas/999999")
        assert r.status_code == 404

    def test_soft_delete_remove_da_listagem(self, client, admin_headers, horta_sp):
        horta_id = horta_sp["id"]
        r_del = client.delete(f"/hortas/{horta_id}", headers=admin_headers)
        assert r_del.status_code == 204

        ids_listagem = [h["id"] for h in client.get("/hortas").json()]
        assert horta_id not in ids_listagem

        assert client.get(f"/hortas/{horta_id}").status_code == 404

    def test_soft_delete_sem_auth_retorna_401(self, client, horta_sp):
        r = client.delete(f"/hortas/{horta_sp['id']}")
        assert r.status_code == 401

    def test_patch_horta_atualiza_dados(self, client, admin_headers, horta_sp):
        r = client.patch(
            f"/hortas/{horta_sp['id']}",
            json={"nome": "Nome Atualizado"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["nome"] == "Nome Atualizado"

    def test_indice_biodiversidade_zero_sem_ciclos(self, client, horta_sp):
        r = client.get(f"/hortas/{horta_sp['id']}")
        assert r.json()["indice_biodiversidade"] == 0


class TestMapaGeoJSON:
    def test_mapa_vazio_retorna_feature_collection_valida(self, client):
        r = client.get("/mapa")
        assert r.status_code == 200
        body = r.json()
        assert body["type"] == "FeatureCollection"
        assert body["features"] == []

    def test_mapa_so_inclui_hortas_com_localizacao(self, client, admin_headers):
        client.post("/hortas", json={"nome": "Com GPS", "area_total": 10.0, "latitude": _SP_LAT, "longitude": _SP_LNG}, headers=admin_headers)
        client.post("/hortas", json={"nome": "Sem GPS", "area_total": 10.0}, headers=admin_headers)

        r = client.get("/mapa")
        nomes = [f["properties"]["nome"] for f in r.json()["features"]]
        assert "Com GPS" in nomes
        assert "Sem GPS" not in nomes

    def test_mapa_feature_formato_geojson_valido(self, client, horta_sp):
        feat = client.get("/mapa").json()["features"][0]
        assert feat["type"] == "Feature"
        assert feat["geometry"]["type"] == "Point"
        coords = feat["geometry"]["coordinates"]
        assert len(coords) == 2
        assert coords[0] == pytest.approx(_SP_LNG, abs=0.01)  # longitude primeiro (RFC 7946)
        assert coords[1] == pytest.approx(_SP_LAT, abs=0.01)

    def test_mapa_retorna_etag(self, client, horta_sp):
        r = client.get("/mapa")
        assert "ETag" in r.headers

    def test_mapa_retorna_304_com_etag_valido(self, client, horta_sp):
        r1 = client.get("/mapa")
        etag = r1.headers["ETag"]
        r2 = client.get("/mapa", headers={"If-None-Match": etag})
        assert r2.status_code == 304

    def test_mapa_nao_retorna_304_apos_mudanca(self, client, admin_headers, horta_sp):
        etag_antes = client.get("/mapa").headers["ETag"]
        client.patch(f"/hortas/{horta_sp['id']}", json={"nome": "Novo Nome"}, headers=admin_headers)
        r = client.get("/mapa", headers={"If-None-Match": etag_antes})
        assert r.status_code == 200  # ETag mudou → conteúdo novo


class TestHortasProximas:
    def test_horta_dentro_do_raio_aparece(self, client, admin_headers, horta_sp):
        r = client.get("/hortas/proximas", params={"lat": _SP_LAT, "lng": _SP_LNG, "raio_km": 1.0})
        assert r.status_code == 200
        nomes = [f["properties"]["nome"] for f in r.json()["features"]]
        assert "Horta SP" in nomes

    def test_horta_fora_do_raio_nao_aparece(self, client, admin_headers, horta_sp):
        # Busca a partir do Rio de Janeiro — SP está a ~360km
        r = client.get("/hortas/proximas", params={"lat": -22.9068, "lng": -43.1729, "raio_km": 5.0})
        nomes = [f["properties"]["nome"] for f in r.json()["features"]]
        assert "Horta SP" not in nomes

    def test_raio_zero_retorna_422(self, client):
        r = client.get("/hortas/proximas", params={"lat": _SP_LAT, "lng": _SP_LNG, "raio_km": 0})
        assert r.status_code == 422

    def test_raio_acima_do_limite_retorna_422(self, client):
        r = client.get("/hortas/proximas", params={"lat": _SP_LAT, "lng": _SP_LNG, "raio_km": 200})
        assert r.status_code == 422

    def test_sem_raio_retorna_422(self, client):
        r = client.get("/hortas/proximas", params={"lat": _SP_LAT, "lng": _SP_LNG})
        assert r.status_code == 422


class TestRiscosDaHorta:
    def test_horta_dentro_de_zona_ativa_aparece_em_riscos(self, client, horta_sp, zona_ativa_cobre_sp):
        r = client.get(f"/hortas/{horta_sp['id']}/riscos")
        assert r.status_code == 200
        riscos = r.json()
        assert len(riscos) == 1
        assert riscos[0]["nome"] == "Zona Alagamento SP"

    def test_zona_inativa_nao_aparece_em_riscos(self, client, admin_headers, horta_sp, db):
        zona_inativa = ZonaRisco(
            nome="Zona Inativa",
            tipo="erosao",
            nivel="baixo",
            area=_POLIGONO_COBRE_SP,
            ativa=False,
        )
        db.add(zona_inativa)
        db.commit()

        r = client.get(f"/hortas/{horta_sp['id']}/riscos")
        nomes = [z["nome"] for z in r.json()]
        assert "Zona Inativa" not in nomes

    def test_zona_fora_da_horta_nao_aparece(self, client, horta_sp, db):
        zona_rj = ZonaRisco(
            nome="Zona RJ",
            tipo="deslizamento",
            nivel="medio",
            area=_POLIGONO_RJ,
            ativa=True,
        )
        db.add(zona_rj)
        db.commit()

        r = client.get(f"/hortas/{horta_sp['id']}/riscos")
        nomes = [z["nome"] for z in r.json()]
        assert "Zona RJ" not in nomes

    def test_horta_sem_localizacao_retorna_lista_vazia(self, client, admin_headers, zona_ativa_cobre_sp):
        r_horta = client.post("/hortas", json={"nome": "Sem GPS", "area_total": 10.0}, headers=admin_headers)
        horta_id = r_horta.json()["id"]

        r = client.get(f"/hortas/{horta_id}/riscos")
        assert r.status_code == 200
        assert r.json() == []

    def test_horta_inexistente_retorna_404(self, client):
        r = client.get("/hortas/999999/riscos")
        assert r.status_code == 404


class TestAlertasAtivos:
    def test_alertas_ativos_retorna_feature_collection(self, client, zona_ativa_cobre_sp):
        r = client.get("/alertas/ativos")
        assert r.status_code == 200
        body = r.json()
        assert body["type"] == "FeatureCollection"
        nomes = [f["properties"]["nome"] for f in body["features"]]
        assert "Zona Alagamento SP" in nomes

    def test_alertas_nao_inclui_zonas_inativas(self, client, db):
        db.add(ZonaRisco(nome="Inativa", tipo="queda", nivel="baixo", area=_POLIGONO_COBRE_SP, ativa=False))
        db.commit()

        r = client.get("/alertas/ativos")
        nomes = [f["properties"]["nome"] for f in r.json()["features"]]
        assert "Inativa" not in nomes

    def test_alertas_retorna_etag(self, client, zona_ativa_cobre_sp):
        r = client.get("/alertas/ativos")
        assert "ETag" in r.headers

    def test_alertas_304_com_etag_valido(self, client, zona_ativa_cobre_sp):
        r1 = client.get("/alertas/ativos")
        etag = r1.headers["ETag"]
        r2 = client.get("/alertas/ativos", headers={"If-None-Match": etag})
        assert r2.status_code == 304


def _situacao_por_nome(client) -> dict:
    feats = client.get("/mapa/completo").json()["features"]
    return {f["properties"]["nome"]: f["properties"]["situacao"] for f in feats}


class TestMapaCompleto:
    """ST_Covers + ST_DWithin classificando a situação de risco de cada horta."""

    def test_horta_dentro_da_zona_fica_dentro(self, client, admin_headers, horta_sp, zona_ativa_cobre_sp):
        assert _situacao_por_nome(client)["Horta SP"] == "dentro"

    def test_horta_proxima_da_zona_fica_em_alerta(self, client, admin_headers, zona_ativa_cobre_sp):
        # ~510m a leste da borda (-46.615 vs -46.62) → dentro do raio de alerta (1km)
        client.post(
            "/hortas",
            json={"nome": "Horta Vizinha", "area_total": 10.0, "latitude": -23.55, "longitude": -46.615},
            headers=admin_headers,
        )
        assert _situacao_por_nome(client)["Horta Vizinha"] == "alerta"

    def test_horta_distante_fica_segura(self, client, admin_headers, zona_ativa_cobre_sp):
        # ~12km a leste de qualquer zona → além do raio de monitoramento (4km)
        client.post(
            "/hortas",
            json={"nome": "Horta Longe", "area_total": 10.0, "latitude": -23.55, "longitude": -46.50},
            headers=admin_headers,
        )
        assert _situacao_por_nome(client)["Horta Longe"] == "segura"


class TestRegistroHortaComLider:
    def _payload(self, cpf, email, nome_horta):
        return {
            "horta": {"nome": nome_horta, "area_total": 50.0},
            "lider": {"nome": "Líder", "email": email, "cpf": cpf, "telefone": "11999999999"},
        }

    def test_registro_cria_horta_e_lider(self, client, admin_headers):
        cpf = _cpf.generate()
        r = client.post(
            "/hortas/registro",
            json=self._payload(cpf, "lider1@horta-urbana.com", "Horta Registro"),
            headers=admin_headers,
        )
        assert r.status_code == 201
        body = r.json()
        assert body["horta"]["nome"] == "Horta Registro"
        assert body["lider"]["privilegio"] == "LIDER_HORTA"
        assert body["lider"]["cpf"] == cpf

    def test_registro_cpf_duplicado_retorna_409_sem_criar_horta(self, client, admin_headers):
        cpf = _cpf.generate()
        client.post(
            "/hortas/registro",
            json=self._payload(cpf, "lider2@horta-urbana.com", "Horta OK"),
            headers=admin_headers,
        )
        nomes_antes = {h["nome"] for h in client.get("/hortas").json()}

        r = client.post(
            "/hortas/registro",
            json=self._payload(cpf, "lider3@horta-urbana.com", "Horta Orfa"),
            headers=admin_headers,
        )
        assert r.status_code == 409
        # rollback atômico: a horta da 2ª tentativa não pode ter ficado órfã
        assert {h["nome"] for h in client.get("/hortas").json()} == nomes_antes
