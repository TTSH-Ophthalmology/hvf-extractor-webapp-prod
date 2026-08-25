from __future__ import annotations

from datetime import datetime, timezone
import json
from json import JSONDecodeError
from pathlib import Path
import secrets
from threading import RLock

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
        self._lock = RLock()
        self._db_path = Path(path or settings.database_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._recover_corrupt_database()

        self._open_database()
        self._seed_admin_user()

    def _open_database(self) -> None:
        self.db = TinyDB(self._db_path)
        self.users = self.db.table("users")
        self.refresh_tokens = self.db.table("refresh_tokens")
        self.app_settings = self.db.table("app_settings")

    def _recover_corrupt_database(self) -> bool:
        db_path = self._db_path
        if not db_path.exists() or db_path.stat().st_size == 0:
            return False

        raw_database = db_path.read_text(encoding="utf-8")

        try:
            json.loads(raw_database)
        except json.JSONDecodeError:
            backup_path = db_path.with_name(
                f"{db_path.name}.corrupt-{_utc_now().strftime('%Y%m%d%H%M%S')}"
            )
            backup_path.write_bytes(db_path.read_bytes())

            try:
                recovered_database, parsed_until = json.JSONDecoder().raw_decode(
                    raw_database
                )
            except json.JSONDecodeError:
                db_path.write_text("{}", encoding="utf-8")
            else:
                remaining_content = raw_database[parsed_until:].strip()
                if remaining_content:
                    db_path.write_text(
                        json.dumps(recovered_database),
                        encoding="utf-8",
                    )
                else:
                    db_path.write_text("{}", encoding="utf-8")
            return True

        return False

    def _recover_runtime_corruption(self) -> None:
        self.db.close()
        self._recover_corrupt_database()
        self._open_database()
        self._seed_admin_user()

    def _read_or_write(self, operation):
        with self._lock:
            try:
                return operation()
            except JSONDecodeError:
                self._recover_runtime_corruption()
                return operation()

    def _seed_admin_user(self) -> None:
        # Always upsert (not just when no users exist yet): .env is the only
        # place the admin password is ever set (there is no change-password
        # feature), so it must be the source of truth on every start.
        # Otherwise a re-run of install.bat/setup_credentials.py writes a new
        # password hash to .env that silently never takes effect, because an
        # admin user from an earlier install already exists.
        with self._lock:
            if not settings.admin_username or not settings.admin_password_hash:
                return

            self.upsert_user(
                username=settings.admin_username,
                password_hash=settings.admin_password_hash,
                role="admin",
            )

    def upsert_user(self, username: str, password_hash: str, role: str) -> None:
        def operation() -> None:
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

        self._read_or_write(operation)

    def get_user(self, username: str) -> dict | None:
        def operation() -> dict | None:
            User = Query()
            return self.users.get(User.username == username)

        return self._read_or_write(operation)

    def get_jwt_secret(self) -> str:
        if settings.jwt_secret_key:
            return settings.jwt_secret_key

        def operation() -> str:
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

        return self._read_or_write(operation)

    def save_refresh_token(
        self,
        *,
        token_id: str,
        username: str,
        expires_at: str | int | float,
    ) -> None:
        def operation() -> None:
            Token = Query()
            self.refresh_tokens.upsert(
                {
                    "token_id": token_id,
                    "username": username,
                    "expires_at": _parse_timestamp(expires_at).isoformat(),
                    "revoked": False,
                    "created_at": _utc_now().isoformat(),
                    "revoked_at": None,
                },
                Token.token_id == token_id,
            )

        self._read_or_write(operation)

    def is_refresh_token_active(self, token_id: str, username: str) -> bool:
        def operation() -> bool:
            self.remove_expired_refresh_tokens()

            Token = Query()
            token = self.refresh_tokens.get(
                (Token.token_id == token_id) & (Token.username == username)
            )
            if not token or token.get("revoked"):
                return False

            return _parse_timestamp(token["expires_at"]) > _utc_now()

        return self._read_or_write(operation)

    def revoke_refresh_token(self, token_id: str) -> None:
        def operation() -> None:
            Token = Query()
            self.refresh_tokens.update(
                {
                    "revoked": True,
                    "revoked_at": _utc_now().isoformat(),
                },
                Token.token_id == token_id,
            )

        self._read_or_write(operation)

    def remove_expired_refresh_tokens(self) -> None:
        def operation() -> None:
            now = _utc_now()
            self.refresh_tokens.remove(
                lambda token: _parse_timestamp(token["expires_at"]) <= now
            )

        self._read_or_write(operation)


store = TinyDbStore()
