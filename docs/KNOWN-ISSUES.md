# Known Issues and Improvement Ideas

Notes from a review of the deployment scripts and adjacent auth code, focused on
user-error scenarios (re-running install, slow machines, multiple installs).
Most items here have since been fixed and are marked as such; a couple remain
open. Ranked roughly by how much it can actually bite someone.

## 1. FIXED: a stray `frontend/.env` could break login on a fresh install

**Where:** `scripts/bundle.ps1`, frontend build step

The single most time-consuming bug found this round. A local `frontend/.env`
(e.g. left over from `setup.ps1`/`setup.sh`, which copies `.env.example`'s
`VITE_API_URL=http://localhost:8000`) could survive into a `bundle.ps1` build
and get baked into the frontend as an absolute API URL, even though
`$env:VITE_API_URL = ""` was set beforehand. On Windows, setting an
environment variable to an empty string can behave like unsetting it
entirely, and dotenv-style loading only skips a `.env` value when the
variable is genuinely already set, so the stray file won.

Symptom: the page loads at `http://127.0.0.1:8000` (as `start.bat` opens it),
but API calls went to the baked-in `http://localhost:8000` instead. Browsers
treat `127.0.0.1` and `localhost` as completely different sites, so every
`SameSite` cookie the backend tried to set was silently blocked. Login
appeared to succeed (`200` on `POST /api/token`), but no session actually
persisted, every subsequent request came back `401`/`403`, and the app
bounced back to the login page.

**Fix (shipped):** `bundle.ps1` now moves any existing `frontend/.env` aside
before building and restores it afterward, regardless of outcome, so there is
nothing for Vite to pick up.

**Still open:** the deeper root fix would be to hardcode `baseURL: ""` in
`frontend/src/services/api.ts` and drop `VITE_API_URL` from `.env.example`
entirely, since this app is never actually deployed with the frontend and
backend on different origins. That would make this bug class structurally
impossible rather than just guarded against in the build script.

## 2. MITIGATED: re-running `install.bat` doesn't actually reset the admin password

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

**Mitigation (shipped):** `scripts/uninstall.bat` / `uninstall.ps1` /
`uninstall.sh` now give an official way to reset (delete `.env`, the
database, uploads, and logs, then re-run install), which is exactly the
scenario this issue was found from: a bundle installed once on a staging
machine, then copied to a target machine, where re-running install alone
silently kept the staging credentials in effect. This is a workaround, not a
fix, the underlying bug below is still there if someone re-installs without
uninstalling first.

**Suggested fix:** make `_seed_admin_user()` always upsert the admin user's
password hash from `.env`, instead of only seeding when the table is empty.
`.env` becomes the actual source of truth on every start, re-running
`install.bat` behaves the way someone would naturally expect, and the
delete-the-database step goes away entirely.

## 3. FIXED: `-SkipWheels` / `-SkipModels` didn't actually work

**Where:** `scripts/bundle.ps1` / `bundle.sh`, "Clean previous bundle" step

Both flags exist to reuse an already-downloaded `wheels/` folder or OCR
models from a previous run. But the "clean previous bundle" step
unconditionally deleted the whole bundle directory before either flag's
"does it already exist" check ever ran, so by the time they checked, the
files were already gone. Every run did a full wheel and model download
regardless of the flags. Confirmed while testing bundling changes this
session, not something introduced this round, it just never worked.

**Fix (shipped):** the clean step now moves `wheels/` and
`backend/data/models/` aside first when the corresponding flag is set, then
moves them back after the wipe, instead of deleting them unconditionally.

## 4. FIXED: `start.bat`'s browser auto-open gives up silently after 90 seconds

**Where:** `scripts/start.bat`, `scripts/start.ps1`, `scripts/start.sh`

The background polling loop that opens the browser once the server responds
had a hard ceiling (90 one-second attempts). If OCR/model loading took
longer than that (slower hardware, first-run cache building, antivirus
scanning every file as it loads), the loop just exited, no browser opened,
and there was no message explaining why. It looked exactly like the app
failed to start when it might just have been slow.

**Fix (shipped):** window lengthened to 3 minutes, and if the app still
isn't up by then, it now says so, a message box on Windows (the polling runs
in a hidden window / background job with no visible console otherwise), a
terminal message on macOS/Linux.

## 5. FIXED: reinstalling to a second folder silently steals the desktop shortcut

**Where:** `scripts/install.bat` / `install.ps1`, desktop shortcut step

The shortcut is always named `NHGEI HVF Extractor.lnk` on the Desktop. If you
install one version in one folder and later install another version in a
different folder, the shortcut just got repointed to whichever was installed
last with no signal that this happened.

**Fix (shipped):** install now checks whether a shortcut already exists and
points somewhere else before overwriting it, and if so, warns with the old
target path. The older install still works fine if launched directly, this
is informational, not blocking.

## 6. No proactive check for risky install locations

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

## 7. Refresh-token rotation has a small race window (not deployment-related)

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

#2 has a workaround (`uninstall.bat`/`.ps1`/`.sh`), but the underlying
`_seed_admin_user()` fix is still worth doing properly at some point, it's a
clean, well-understood bug with a clean fix. #6 and #7 remain open, both
low priority (documentation-level and a product decision, respectively).
