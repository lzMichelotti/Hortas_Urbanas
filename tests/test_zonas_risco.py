"""Testes de zonas de risco: validação do POST /zonas-risco."""
import pytest

# Quadrado em Santa Maria/RS, anel aberto (o backend fecha)
_QUADRADO = [
    [-53.81, -29.69],
    [-53.79, -29.69],
    [-53.79, -29.67],
    [-53.81, -29.67],
]

# Gravata-borboleta: 4 pontos distintos, arestas se cruzam (inválido)
_GRAVATA = [
    [-53.81, -29.69],
    [-53.79, -29.67],
    [-53.79, -29.69],
    [-53.81, -29.67],
]


def _payload(coords):
    return {"nome": "Zona Teste", "tipo": "alagamento", "nivel": "alto", "coordinates": coords}


@pytest.mark.integration
class TestCriacaoZona:
    def test_cria_zona_valida_e_fecha_anel(self, client, admin_headers):
        r = client.post("/zonas-risco", json=_payload(_QUADRADO), headers=admin_headers)
        assert r.status_code == 201
        body = r.json()
        assert body["geometry"]["type"] == "Polygon"
        anel = body["geometry"]["coordinates"][0]
        assert anel[0] == anel[-1]

        r = client.get(f"/zonas-risco/{body['id']}")
        assert r.status_code == 200
        assert r.json()["nome"] == "Zona Teste"

    def test_sem_token_401(self, client):
        r = client.post("/zonas-risco", json=_payload(_QUADRADO))
        assert r.status_code == 401

    def test_menos_de_tres_pontos_422(self, client, admin_headers):
        r = client.post("/zonas-risco", json=_payload(_QUADRADO[:2]), headers=admin_headers)
        assert r.status_code == 422

    def test_pontos_repetidos_422(self, client, admin_headers):
        r = client.post("/zonas-risco", json=_payload([[-53.81, -29.69]] * 4), headers=admin_headers)
        assert r.status_code == 422

    def test_latitude_fora_do_intervalo_422(self, client, admin_headers):
        coords = [[-53.81, -95.0], [-53.79, -29.69], [-53.79, -29.67]]
        r = client.post("/zonas-risco", json=_payload(coords), headers=admin_headers)
        assert r.status_code == 422

    def test_longitude_fora_do_intervalo_422(self, client, admin_headers):
        coords = [[190.0, -29.69], [-53.79, -29.69], [-53.79, -29.67]]
        r = client.post("/zonas-risco", json=_payload(coords), headers=admin_headers)
        assert r.status_code == 422

    def test_ponto_sem_par_422(self, client, admin_headers):
        coords = [[-53.81], [-53.79, -29.69], [-53.79, -29.67]]
        r = client.post("/zonas-risco", json=_payload(coords), headers=admin_headers)
        assert r.status_code == 422

    def test_poligono_auto_intersectante_422(self, client, admin_headers):
        r = client.post("/zonas-risco", json=_payload(_GRAVATA), headers=admin_headers)
        assert r.status_code == 422
        assert "cruza" in r.json()["detail"]

