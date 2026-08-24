# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
