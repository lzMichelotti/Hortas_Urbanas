"""
Importa zonas de risco a partir de Shapefile ou GeoJSON para a tabela ZonasRisco.

Uso:
    python scripts/importar_zonas_risco.py <caminho_do_arquivo>

Exemplos:
    python scripts/importar_zonas_risco.py dados/santa_maria_risco.shp
    python scripts/importar_zonas_risco.py dados/zonas_risco_cprm.geojson

Antes de rodar, ajuste o dicionário MAPEAMENTO_COLUNAS abaixo
com os nomes reais das colunas do arquivo recebido.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import geopandas as gpd
from shapely.geometry import MultiPolygon, Polygon
from sqlalchemy.orm import Session

from app.database.session import engine
from app.database.models import ZonaRisco

# ------------------------------------------------------------------
# CONFIGURAÇÃO — colunas do SGB/CPRM (sig_santa_maria_rs_risco_2025)
# ------------------------------------------------------------------
MAPEAMENTO_COLUNAS = {
    "nome":      "LOCAL",      # localização/nome do setor de risco
    "tipo":      "TIPOLO_G1",  # tipologia principal: Inundação, Erosão...
    "nivel":     "GRAU_RISCO", # grau de risco: Alto, Muito alto, Médio...
    "descricao": "DESCRICAO",  # descrição técnica do setor
}

NORMALIZAR_NIVEL = {
    "muito alto": "alto",
    "alto":       "alto",
    "medio":      "medio",
    "médio":      "medio",
    "baixo":      "baixo",
}

NORMALIZAR_TIPO = {
    "inundação":    "alagamento",
    "inundacao":    "alagamento",
    "alagamento":   "alagamento",
    "erosão":       "erosao",
    "erosao":       "erosao",
    "deslizamento": "deslizamento",
    "movimento de massa": "deslizamento",
}
# ------------------------------------------------------------------


def corrigir_encoding(valor) -> str | None:
    """Corrige texto UTF-8 lido incorretamente como latin-1."""
    if not isinstance(valor, str):
        return valor
    try:
        return valor.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return valor


def normalizar(valor: str | None, tabela: dict) -> str:
    if not valor:
        return "outro"
    return tabela.get(str(valor).strip().lower(), str(valor).strip().lower())


def poligonos_do_shape(geom) -> list[Polygon]:
    """Extrai polígonos simples de uma geometria (suporta MultiPolygon)."""
    if isinstance(geom, Polygon):
        return [geom]
    if isinstance(geom, MultiPolygon):
        return list(geom.geoms)
    return []


def main(caminho: str):
    print(f"Lendo arquivo: {caminho}")
    gdf = gpd.read_file(caminho, engine="fiona", encoding="latin-1")

    print(f"CRS original: {gdf.crs}")
    if gdf.crs is None or gdf.crs.to_epsg() != 4326:
        print("Reprojetando para SRID 4326 (WGS84)...")
        gdf = gdf.to_crs(epsg=4326)

    print(f"Total de registros encontrados: {len(gdf)}")
    print(f"Colunas disponíveis: {list(gdf.columns)}\n")

    inseridos = 0
    ignorados = 0

    with Session(engine) as db:
        for _, row in gdf.iterrows():
            geom = row.geometry
            if geom is None or geom.is_empty:
                ignorados += 1
                continue

            poligonos = poligonos_do_shape(geom)
            if not poligonos:
                ignorados += 1
                continue

            nome      = corrigir_encoding(row.get(MAPEAMENTO_COLUNAS["nome"], "Sem nome")) or "Sem nome"
            tipo_raw  = corrigir_encoding(row.get(MAPEAMENTO_COLUNAS["tipo"], None))
            nivel_raw = corrigir_encoding(row.get(MAPEAMENTO_COLUNAS["nivel"], None))
            descricao = corrigir_encoding(row.get(MAPEAMENTO_COLUNAS["descricao"], None))

            tipo  = normalizar(tipo_raw,  NORMALIZAR_TIPO)
            nivel = normalizar(nivel_raw, NORMALIZAR_NIVEL)

            for poligono in poligonos:
                wkt = f"SRID=4326;{poligono.wkt}"
                db_zona = ZonaRisco(
                    nome=str(nome),
                    tipo=tipo,
                    nivel=nivel,
                    descricao=str(descricao) if descricao else None,
                    area=wkt,
                )
                db.add(db_zona)
                inseridos += 1

        db.commit()

    print(f"Concluido: {inseridos} zona(s) inserida(s), {ignorados} ignorada(s).")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/importar_zonas_risco.py <caminho_do_arquivo>")
        sys.exit(1)

    main(sys.argv[1])
