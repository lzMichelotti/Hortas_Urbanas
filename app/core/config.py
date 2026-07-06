from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SECRET_KEY: str
    DATABASE_URL: str

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: List[str]

    # --- Clima (Open-Meteo) ---
    CLIMA_LATITUDE: float = -29.6842
    CLIMA_LONGITUDE: float = -53.8069
    CLIMA_TIMEZONE: str = "America/Sao_Paulo"
    CLIMA_FORECAST_DAYS: int = 7
    CLIMA_CACHE_TTL: int = 3600

    # --- Cloudflare R2 ---
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_BASE_URL: str = ""

    R2_MAX_IMAGENS_POR_POST: int = 3
    R2_MAX_BYTES: int = 5 * 1024 * 1024
    R2_PRESIGN_EXPIRES: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
