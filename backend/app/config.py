"""
config.py — Application settings loaded from environment variables.

Uses pydantic-settings so every value is typed and validated at startup.
Values are read from the .env file or the real environment.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000

    # Directory where uploaded PDFs are temporarily stored
    upload_dir: str = "./uploads"

    # Max upload size in bytes (default 200 MB)
    max_upload_size: int = 200 * 1024 * 1024

    # Allowed CORS origins (Vite dev server by default)
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Logging level — DEBUG gives verbose output; use INFO or WARNING in prod
    log_level: str = "INFO"

    # Directory where rotating log files are written
    log_dir: str = "./data/logs"


settings = Settings()
