from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Intelliquery"
    API_V1_STR: str = "/api/v1"
    
    # Let Pydantic automatically look for these inside your .env file
    DATABASE_URL: str
    ENCRYPTION_KEY: str

    # LLM Providers
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: Optional[str] = None

    # LLM fallback order (comma-separated): openai,gemini
    LLM_FALLBACK_ORDER: str = "openai,gemini"

    # Voice / Whisper
    WHISPER_MODEL: str = "whisper-1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()