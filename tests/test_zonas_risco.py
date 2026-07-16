"""Testes de zonas de risco: validação do POST /zonas-risco e helpers do importador."""
import pytest
from shapely.geometry import MultiPolygon, Point, Polygon
from shapely.validation import make_valid

from scripts.importar_zonas_risco import (
    normalizar_nivel, normalizar_tipo, poligonos_do_shape,
)

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


@pytest.mark.unit
class TestNormalizacaoImportador:
    def test_tipo_mapeado(self):
        assert normalizar_tipo("Inundação") == "alagamento"
        assert normalizar_tipo("  QUEDA DE BLOCO ") == "queda"

    def test_tipo_desconhecido_vira_outro(self):
        assert normalizar_tipo("corrida de massa") == "outro"
        assert normalizar_tipo(None) == "outro"
        assert normalizar_tipo("") == "outro"

    def test_nivel_mapeado(self):
        assert normalizar_nivel("Muito Alto") == "alto"
        assert normalizar_nivel("médio") == "medio"

    def test_nivel_desconhecido_devolve_none(self):
        assert normalizar_nivel("muito baixo") is None
        assert normalizar_nivel(None) is None
        assert normalizar_nivel("") is None


@pytest.mark.unit
class TestGeometriaImportador:
    def test_poligono_simples(self):
        p = Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
        assert poligonos_do_shape(p) == [p]

    def test_multipolygon_extrai_todos(self):
        a = Polygon([(0, 0), (1, 0), (1, 1)])
        b = Polygon([(2, 2), (3, 2), (3, 3)])
        assert poligonos_do_shape(MultiPolygon([a, b])) == [a, b]

    def test_geometria_nao_poligonal_e_descartada(self):
        assert poligonos_do_shape(Point(0, 0)) == []

    def test_gravata_reparada_gera_poligonos_validos(self):
        gravata = Polygon([(0, 0), (2, 2), (2, 0), (0, 2)])
        assert not gravata.is_valid
        partes = poligonos_do_shape(make_valid(gravata))
        assert partes
        assert all(p.is_valid for p in partes)
        assert sum(p.area for p in partes) > 0
