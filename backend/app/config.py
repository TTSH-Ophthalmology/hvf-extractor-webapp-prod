"""
config.py — Application settings loaded from environment variables.

Uses pydantic-settings so every value is typed and validated at startup.
Values are read from the .env file or the real environment.
"""

from pathlib import Path
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict


def resource_base_dir() -> Path:
    """Return the directory that contains bundled runtime resources."""
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)).resolve()

    return Path(__file__).resolve().parents[1]


def runtime_base_dir() -> Path:
    """Return the directory where the app can write runtime state."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent

    return resource_base_dir()


def resolve_runtime_path(path: str) -> Path:
    candidate = Path(path).expanduser()
    if candidate.is_absolute():
        return candidate

    return runtime_base_dir() / candidate


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=resource_base_dir() / ".env",
        env_file_encoding="utf-8",
    )

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

    database_path: str = "./data/database.json"

    admin_username: str | None = None
    admin_password_hash: str | None = None
    jwt_secret_key: str | None = None
    cookie_secure: bool = False

    @property
    def resolved_upload_dir(self) -> Path:
        return resolve_runtime_path(self.upload_dir)

    @property
    def resolved_log_dir(self) -> Path:
        return resolve_runtime_path(self.log_dir)

    @property
    def resolved_database_path(self) -> Path:
        return resolve_runtime_path(self.database_path)


settings = Settings()
