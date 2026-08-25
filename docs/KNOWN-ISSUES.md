# Known Issues and Improvement Ideas

Notes from a review of the deployment scripts and adjacent auth code, focused on
user-error scenarios (re-running install, slow machines, multiple installs).
Nothing here has been fixed yet. Ranked roughly by how much it can actually
bite someone.

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

The current "fix" is a manual step documented in `docs/AIRGAPPED-DEPLOY.md`
("Changing credentials": re-run install, then delete
`backend\data\database.json`), which is really a workaround for the bug, not
a designed recovery flow. This is what cost the most time in the deployment
troubleshooting session that produced this list.

**Suggested fix:** make `_seed_admin_user()` always upsert the admin user's
password hash from `.env`, instead of only seeding when the table is empty.
`.env` becomes the actual source of truth on every start, re-running
`install.bat` behaves the way someone would naturally expect, and the
delete-the-database step goes away entirely.

## 2. `start.bat`'s browser auto-open gives up silently after 90 seconds

**Where:** `scripts/start.bat`, `scripts/start.ps1`, `scripts/start.sh`

The background polling loop that opens the browser once the server responds
has a hard ceiling (90 one-second attempts). If OCR/model loading takes
longer than that (slower hardware, first-run cache building, antivirus
scanning every file as it loads), the loop just exits, no browser opens, and
there's no message explaining why. It looks exactly like the app failed to
start when it might just be slow.

**Suggested fix:** lengthen the window, and/or print a message after the loop
gives up ("still starting, once ready open http://127.0.0.1:8000 manually").

## 3. Reinstalling to a second folder silently steals the desktop shortcut

**Where:** `scripts/install.bat` / `install.ps1`, desktop shortcut step

The shortcut is always named `NHGEI HVF Extractor.lnk` on the Desktop. If you
install one version in one folder and later install another version in a
different folder, the shortcut just gets repointed to whichever was installed
last. The older folder still works fine if launched manually, but there's no
signal that you now have two installs and the shortcut only points to one of
them.

**Suggested fix:** low priority. Could version the shortcut name, or warn if
a shortcut already exists and points somewhere else, but probably not worth
the complexity unless it actually causes confusion in practice.

## 4. No proactive check for risky install locations

**Where:** `scripts/install.bat` / `install.ps1`

The error messages already suggest copying the bundle to a local folder like
`C:\HVF-Extractor\` after a failure (see the "Access is denied" handling
added for pip install and credential setup), but nothing checks proactively,
e.g. running straight from `Downloads`, a USB stick about to be unplugged, or
a OneDrive-synced folder.

**Suggested fix:** could add an upfront check (drive type, or path pattern),
but this starts to solve a Windows-permissions problem in batch script, with
diminishing returns. Leaning toward leaving this as reactive documentation
rather than trying to detect it.

## 5. Refresh-token rotation has a small race window (not deployment-related)

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
cookie could leave a legitimate session stuck logged out. Separate from
anything debugged in the deployment session, flagged here because it's the
same code area and came up during the same review pass.

**Suggested fix:** revoke the old token only after the new one is
successfully issued (or accept the current behavior as an acceptable
trade-off for revocation-on-use security, this needs a product decision, not
just a code change).

---

Of these, #1 is the one worth actually fixing. It's a clean, well-understood
bug with a clean fix, and it's the thing that caused the most confusion
during deployment testing. The rest are minor or documentation-level.
