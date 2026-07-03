from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import secrets

from tinydb import Query, TinyDB

from app.config import settings


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_timestamp(value: str | int | float) -> datetime:
    if isinstance(value, int | float):
        return datetime.fromtimestamp(value, tz=timezone.utc)

    if value.endswith("Z"):
        value = value[:-1] + "+00:00"

    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


class TinyDbStore:
    def __init__(self, path: str | None = None):
        db_path = Path(path or settings.database_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._recover_corrupt_database(db_path)

        self.db = TinyDB(db_path)
        self.users = self.db.table("users")
        self.refresh_tokens = self.db.table("refresh_tokens")
        self.app_settings = self.db.table("app_settings")
        self._seed_admin_user()

    def _recover_corrupt_database(self, db_path: Path) -> None:
        if not db_path.exists() or db_path.stat().st_size == 0:
            return

        try:
            json.loads(db_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            backup_path = db_path.with_name(
                f"{db_path.name}.corrupt-{_utc_now().strftime('%Y%m%d%H%M%S')}"
            )
            backup_path.write_bytes(db_path.read_bytes())
            db_path.write_text("{}", encoding="utf-8")

    def _seed_admin_user(self) -> None:
        if len(self.users) > 0:
            return

        if not settings.admin_username or not settings.admin_password_hash:
            return

        self.upsert_user(
            username=settings.admin_username,
            password_hash=settings.admin_password_hash,
            role="admin",
        )

    def upsert_user(self, username: str, password_hash: str, role: str) -> None:
        User = Query()
        self.users.upsert(
            {
                "username": username,
                "password_hash": password_hash,
                "role": role,
                "created_at": _utc_now().isoformat(),
            },
            User.username == username,
        )

    def get_user(self, username: str) -> dict | None:
        User = Query()
        return self.users.get(User.username == username)

    def get_jwt_secret(self) -> str:
        if settings.jwt_secret_key:
            return settings.jwt_secret_key

        Setting = Query()
        existing = self.app_settings.get(Setting.key == "jwt_secret_key")
        if existing:
            return existing["value"]

        value = secrets.token_urlsafe(48)
        self.app_settings.insert(
            {
                "key": "jwt_secret_key",
                "value": value,
                "created_at": _utc_now().isoformat(),
            }
        )
        return value

    def save_refresh_token(
        self,
        *,
        token_id: str,
        username: str,
        expires_at: str | int | float,
    ) -> None:
        Token = Query()
        self.refresh_tokens.upsert(
            {
                "token_id": token_id,
                "username": username,
                "expires_at": (
                    _parse_timestamp(expires_at).isoformat()
                    if not isinstance(expires_at, str)
                    else _parse_timestamp(expires_at).isoformat()
                ),
                "revoked": False,
                "created_at": _utc_now().isoformat(),
                "revoked_at": None,
            },
            Token.token_id == token_id,
        )

    def is_refresh_token_active(self, token_id: str, username: str) -> bool:
        self.remove_expired_refresh_tokens()

        Token = Query()
        token = self.refresh_tokens.get(
            (Token.token_id == token_id) & (Token.username == username)
        )
        if not token or token.get("revoked"):
            return False

        return _parse_timestamp(token["expires_at"]) > _utc_now()

    def revoke_refresh_token(self, token_id: str) -> None:
        Token = Query()
        self.refresh_tokens.update(
            {
                "revoked": True,
                "revoked_at": _utc_now().isoformat(),
            },
            Token.token_id == token_id,
        )

    def remove_expired_refresh_tokens(self) -> None:
        now = _utc_now()
        self.refresh_tokens.remove(
            lambda token: _parse_timestamp(token["expires_at"]) <= now
        )


store = TinyDbStore()
