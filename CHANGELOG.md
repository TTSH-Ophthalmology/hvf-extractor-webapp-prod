# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-08-25

### Added

- Desktop shortcut with a custom icon, created by `install.bat` / `install.ps1` (best-effort, non-fatal if it fails)

### Fixed

- `bundle.ps1` actually works when run from a non-Windows dev machine: path separators no longer hardcoded to backslash, pip is bootstrapped into the bundled Windows Python without ever executing it, and the pip wheel is extracted by content instead of via `Expand-Archive` (which rejects `.whl` based on file extension)
- `bundle.ps1`'s win32 dependency-marker workaround (needed when cross-building from a non-Windows host) is no longer applied when bundling natively on Windows, fixing a missing `colorama` wheel that broke offline installs
- Native command output (npm, pip, paddleocr) no longer crashes `bundle.ps1` with a RemoteException on Windows PowerShell 5.1
- `npm ci` / `npm run build` failures during bundling are no longer silently hidden
- `bundle.ps1` now checks that `paddleocr` is installed on the dev machine upfront, instead of failing deep into the OCR model download step
- `install.bat` / `install.ps1` no longer hard-fail if a data directory can't be created (e.g. permissions) — warn and continue instead
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
