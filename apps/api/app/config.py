"""Ilova sozlamalari — barcha qiymatlar `.env` dan o'qiladi (12-factor)."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "LunchDrop"
    env: str = "development"
    debug: bool = True

    # --- Database ---
    # Majburiy — default yo'q. Faqat .env (DATABASE_URL) dan keladi.
    # Maxfiy ulanish satri kodda saqlanmaydi (security.md).
    database_url: str

    # --- JWT (RS256) ---
    jwt_algorithm: str = "RS256"
    jwt_private_key_path: str = "keys/private.pem"
    jwt_public_key_path: str = "keys/public.pem"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # --- CORS (vergul bilan ajratilgan ro'yxat) ---
    cors_origins: str = "http://localhost:3000"

    # --- Biznes logika ---
    timezone: str = "Asia/Tashkent"
    batching_min_orders_per_group: int = Field(default=1, ge=1)

    # --- Fayl saqlash (rasm) ---
    # S3 sozlanmagan bo'lsa lokal saqlanadi: media_dir ichiga, /media orqali ko'rsatiladi.
    media_dir: str = "media"
    # To'liq URL uchun (masalan "http://164.90.210.222:8000"). Bo'sh bo'lsa nisbiy "/media/..." qaytadi.
    public_base_url: str = ""

    # --- Integratsiyalar (ixtiyoriy) ---
    s3_endpoint_url: str = ""
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    sms_api_url: str = ""
    sms_api_key: str = ""

    # --- Test hisob (Play Market review uchun) ---
    # Bo'sh qolsa bypass o'chiriladi.
    test_phone: str = ""
    test_otp: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS originlarini ro'yxat sifatida qaytaradi."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Sozlamalarni bir marta o'qib, keshlaydi."""
    return Settings()


settings = get_settings()
