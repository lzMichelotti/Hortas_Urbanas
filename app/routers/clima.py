from fastapi import APIRouter, Request

from app.core.clima import obter_clima
from app.core.http import aplica_etag
from app.schemas.clima import ClimaAtual, ClimaDia, ClimaResposta

router = APIRouter(tags=["Clima"])

# Previsão muda devagar e é igual pra todos — fresh por 1h, reutilizável via stale-while-revalidate
_CACHE_CLIMA = "public, max-age=3600, stale-while-revalidate=86400"


def _montar_resposta(dados: dict) -> ClimaResposta:
    atual = dados["current"]
    d = dados["daily"]
    dias = [
        ClimaDia(
            data=data, codigo=codigo, temp_max=tmax, temp_min=tmin,
            chuva_mm=chuva, chance_chuva=chance, uv_max=uv, vento_max=vmax,
        )
        for data, codigo, tmax, tmin, chuva, chance, uv, vmax in zip(
            d["time"], d["weather_code"], d["temperature_2m_max"],
            d["temperature_2m_min"], d["precipitation_sum"],
            d["precipitation_probability_max"], d["uv_index_max"],
            d["wind_speed_10m_max"], strict=True,
        )
    ]
    return ClimaResposta(
        atual=ClimaAtual(
            temperatura=atual["temperature_2m"],
            sensacao=atual["apparent_temperature"],
            codigo=atual["weather_code"],
            vento=atual["wind_speed_10m"],
        ),
        dias=dias,
    )


@router.get("/clima", response_model=ClimaResposta)
def read_clima(request: Request):
    dados = obter_clima()
    payload = _montar_resposta(dados)
    return aplica_etag(request, payload, cache_control=_CACHE_CLIMA)
