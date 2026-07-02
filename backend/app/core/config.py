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

    # Model selection — override via .env if you want a different model
    OPENAI_MODEL: str = "gpt-4o-mini"
    # gemini-2.0-flash no longer has free-tier quota — 2.5-flash does
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # LLM fallback order (comma-separated): openai,gemini
    LLM_FALLBACK_ORDER: str = "openai,gemini"

    # Voice / Whisper
    WHISPER_MODEL: str = "whisper-1"

    # Outgoing email (team invites). Same variables the frontend uses;
    # leave SMTP_HOST empty in dev to log links instead of sending.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_SECURE: bool = False
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM: str = "Intelliquery <noreply@intelliquery.com>"

    # Where invite links point (the Next.js app)
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()