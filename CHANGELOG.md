# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-08-25

### Added

- Completed extraction results are now persisted to disk (`uploads/results/{job_id}.json`) and recoverable via `GET /api/extract/{job_id}`. Previously a result only ever existed as the response to the original `POST /api/extract` call; if that response never reached the browser (dropped connection, forced re-login mid-request), the extraction had to be re-run from scratch with no way to get the original result back. Kept until the next server restart, matching the existing upload-cleanup lifecycle.
- The frontend now tracks in-flight extraction jobs in `localStorage` and checks for recoverable results on load. If a submission's response was lost, the next visit shows a "Previous Results Recovered" banner and restores the result automatically instead of silently losing it.

### Fixed

- Refresh-token rotation (`POST /api/refresh`) no longer has a race window where a network blip between revoking the old token and the client receiving the new one could leave a legitimate session stuck logged out. The old token is now revoked only after the new one is confirmed saved, and a 10-second grace period lets a client that retries after a dropped response still complete rotation.

## [1.2.8] - 2026-08-25

### Added

- Every bundle now includes a plain-language `README.txt` at its root for whoever runs it on the target machine (not assumed to be technical): just what to double-click/run, in order, for first-time setup and for starting over with a fresh copy.

### Fixed

- Re-running `install.bat`/`install.ps1`/`install.sh` now actually resets the admin password. `_seed_admin_user()` previously only seeded the admin user once ever, so a re-install's fresh credentials were silently ignored if an admin user already existed from an earlier install (e.g. one that happened on a staging machine before the bundle was copied elsewhere). `.env` is now the source of truth on every start, matching what `setup_credentials.py` actually writes. This was the underlying bug behind the `uninstall` scripts added in 1.2.4, that workaround is no longer strictly necessary for this specific case (though still useful for a full state reset).

## [1.2.7] - 2026-08-25

### Added

- `install.bat` / `install.ps1` now warn upfront (non-fatal) if the bundle folder is on a removable drive, inside `Downloads`, or inside a OneDrive-synced folder, before anything else runs, instead of only suggesting this reactively after a failure.

## [1.2.6] - 2026-08-25

### Fixed

- `-SkipWheels` / `-SkipModels` (`bundle.ps1` / `bundle.sh --skip-wheels` / `--skip-models`) now actually work. The "clean previous bundle" step used to wipe the whole bundle directory unconditionally, deleting `wheels/` and `backend/data/models/` before either flag's "does it already exist" check ever ran. They're now preserved across the clean step when the corresponding flag is set.
- Reinstalling to a second folder no longer silently steals the desktop shortcut with no explanation. `install.bat` / `install.ps1` now warn (with the old target path) if a shortcut already exists and points somewhere else, before overwriting it.

## [1.2.5] - 2026-08-25

### Fixed

- `start.bat` / `start.ps1` / `start.sh`'s browser auto-open no longer fails silently. The wait window is longer (90s to 3 minutes, since OCR/model loading can be slow on constrained machines), and if the app still isn't up by then, it now tells you (a message box on Windows, since the polling runs in a hidden window/background job with no visible console; a terminal message on macOS/Linux) instead of just doing nothing.

## [1.2.4] - 2026-08-25

### Added

- `uninstall.bat` / `uninstall.ps1` / `uninstall.sh` reset an installed bundle back to a fresh state (admin credentials, database, uploads, logs, desktop shortcut), without needing to re-copy or re-bundle anything. This is the official recovery path when a bundle installed once (e.g. on a staging machine) gets copied elsewhere, since re-running `install` alone does not reset the admin password.

### Changed

- Bundle output now lands under `dist/hvf-extractor-v<version>/` instead of `dist-bundle-<version>/` at the project root.

## [1.2.3] - 2026-08-25

### Fixed

- Login appeared to succeed but never actually persisted a session: a stray `frontend/.env` (e.g. left over from `setup.ps1`/`setup.sh`) could survive into a `bundle.ps1` build and get baked in as an absolute `VITE_API_URL=http://localhost:8000`, while the app is actually opened at `http://127.0.0.1:8000`. Browsers treat `127.0.0.1` and `localhost` as different sites, so every `SameSite` auth cookie was silently blocked. `bundle.ps1` now moves any `frontend/.env` aside for the duration of the build and restores it afterward, regardless of outcome.
- `bundle.ps1` no longer duplicates a ~1GB+ Python environment: it reuses `backend/.venv` (the same one `setup.ps1`/`setup.sh` create for local dev) if it already has what the bundler needs, only creating and populating it on a machine that's never run setup before.

### Changed

- `VERSION` is now the single source of truth for the app version everywhere. `backend/app/main.py` reads it at startup and the frontend reads it at build time, instead of both being manually kept in sync by hand on every release.

## [1.2.1] - 2026-08-25

### Added

- Desktop shortcut with a custom icon, created by `install.bat` / `install.ps1` (best-effort, non-fatal if it fails)

### Fixed

- `bundle.ps1` actually works when run from a non-Windows dev machine: path separators no longer hardcoded to backslash, pip is bootstrapped into the bundled Windows Python without ever executing it, and the pip wheel is extracted by content instead of via `Expand-Archive` (which rejects `.whl` based on file extension)
- `bundle.ps1`'s win32 dependency-marker workaround (needed when cross-building from a non-Windows host) is no longer applied when bundling natively on Windows, fixing a missing `colorama` wheel that broke offline installs
- Native command output (npm, pip, paddleocr) no longer crashes `bundle.ps1` with a RemoteException on Windows PowerShell 5.1
- `npm ci` / `npm run build` failures during bundling are no longer silently hidden
- `bundle.ps1` now checks that `paddleocr` is installed on the dev machine upfront, instead of failing deep into the OCR model download step
- `install.bat` / `install.ps1` no longer hard-fail if a data directory can't be created (e.g. permissions), they warn and continue instead
- Clearer error messages when `pip install` or credential setup fails with "Access is denied" (antivirus or security policy), suggesting moving the bundle to a local folder
- `@vitejs/plugin-react` bumped for `vite@8` compatibility (a fresh `npm ci` was failing outright)

## [1.2.0] - 2026-08-24

### Added

- App version footer in the sidebar (frontend)
- Automatic browser launch from `start.bat` / `start.ps1` / `start.sh` once the server is ready

### Fixed

- `install.sh` now matches `install.bat` / `install.ps1`: quiet pip output and explicit error messages on failed dependency install or credential setup
- Deployment docs corrected to match actual script/bundle behavior (removed references to non-existent `install_312`/`start_312` scripts and browser-opening steps that are now automatic)

## [1.1.0] - 2026-08-24

Initial versioned release.

### Added

- PDF upload and extraction pipeline for Humphrey Visual Field (HVF) reports
- In-browser review and editing of extracted values
- CSV export of extracted data
- Report template management
- JWT-based authentication with httpOnly cookies and CSRF protection
- Air-gapped deployment bundle (installer/start scripts, bundled Python runtime, PaddleOCR models) for Windows
