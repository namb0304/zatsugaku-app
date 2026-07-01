from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    SUPABASE_URL: str | None = None
    SUPABASE_SECRET_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    # Gemini-specific safe default, documented in .env.example
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"


settings = Settings()
