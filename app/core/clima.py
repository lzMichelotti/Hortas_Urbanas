import json
import time
import urllib.error
import urllib.parse
import urllib.request

from app.core.config import settings

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_SEGUNDOS = 10

_cache: dict | None = None
_cache_instante: float = 0.0


def buscar_clima() -> dict:
    params = urllib.parse.urlencode({
        "latitude": settings.CLIMA_LATITUDE,
        "longitude": settings.CLIMA_LONGITUDE,
        "current": "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,wind_speed_10m_max",
        "timezone": settings.CLIMA_TIMEZONE,
        "forecast_days": settings.CLIMA_FORECAST_DAYS,
    })
    url = f"{OPEN_METEO_URL}?{params}"

    with urllib.request.urlopen(url, timeout=TIMEOUT_SEGUNDOS) as resp:
        corpo = resp.read()

    return json.loads(corpo.decode("utf-8"))


def obter_clima() -> dict:
    global _cache, _cache_instante
    agora = time.monotonic()

    # ainda fresco? devolve sem chamar a API
    if _cache is not None and (agora - _cache_instante) < settings.CLIMA_CACHE_TTL:
        return _cache

    # expirou (ou primeira vez): tenta renovar
    try:
        _cache = buscar_clima()
        _cache_instante = agora
    except urllib.error.URLError:
        if _cache is not None:
            return _cache   # API caiu → serve a última previsão boa
        raise               # nunca tivemos dados → propaga o erro
    return _cache
