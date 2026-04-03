from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "Intelliquery"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    # LLM Providers
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)

    # LLM fallback order (comma-separated): openai,gemini
    LLM_FALLBACK_ORDER: str = os.getenv("LLM_FALLBACK_ORDER", "openai,gemini")

    # Voice / Whisper
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "whisper-1")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")