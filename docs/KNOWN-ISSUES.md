# Known Issues and Improvement Ideas

Notes from a review of the deployment scripts and adjacent auth code, focused on
user-error scenarios (re-running install, slow machines, multiple installs).
Only items that still need a fix are kept here; see `CHANGELOG.md` for what's
already shipped. Ranked roughly by how much it can actually bite someone.

## 1. Re-running `install.bat` doesn't actually reset the admin password

**Where:** `backend/app/db/db.py`, `_seed_admin_user()`

The install flow writes a fresh password hash and JWT secret into `.env` every
time `setup_credentials.py` runs, but the admin user only gets seeded into
the database once:

```python
def _seed_admin_user(self) -> None:
    if len(self.users) > 0:
        return
```

If someone re-runs `install.bat` on a folder that's already been started
before (fresh credentials, "just to be safe," re-installing after a copy,
etc.), the new credentials in `.env` are silently ignored. The old password
from the first run is still what's actually checked against. Nothing in the
install output warns about this.

**Mitigation shipped:** `scripts/uninstall.bat` / `uninstall.ps1` /
`uninstall.sh` give an official way to reset (delete `.env`, the database,
uploads, and logs, then re-run install). This is a workaround, not a fix,
the underlying bug is still there if someone re-installs without
uninstalling first.

**Suggested fix:** make `_seed_admin_user()` always upsert the admin user's
password hash from `.env`, instead of only seeding when the table is empty.
`.env` becomes the actual source of truth on every start, re-running
`install.bat` behaves the way someone would naturally expect, and the
uninstall-first workaround stops being necessary for this specific case.

## 2. Refresh-token rotation has a small race window (not deployment-related)

**Where:** `backend/app/main.py`, `POST /api/refresh`

The old refresh token gets revoked before the new one is confirmed delivered
to the client:

```python
store.revoke_refresh_token(token_id)

new_access_token = create_access_token(...)
new_refresh_token = create_refresh_token(...)
...
response.set_cookie(key="refresh_token", value=new_refresh_token, ...)
```

A network blip between the revoke and the client actually receiving the new
cookie could leave a legitimate session stuck logged out.

**Suggested fix:** revoke the old token only after the new one is
successfully issued (or accept the current behavior as an acceptable
trade-off for revocation-on-use security, this needs a product decision, not
just a code change).
