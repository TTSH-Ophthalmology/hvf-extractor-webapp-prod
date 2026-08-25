# Air-Gapped Deployment Guide

Deploy the HVF Extractor to a machine with no internet access, no Node.js, and no separate web server. The bundle includes a pre-built frontend served directly by the FastAPI backend.

---

## Requirements

### Developer machine (builds the bundle)
- Python 3.11+ (3.12+ recommended)
- Node.js 20+ and npm
- `paddleocr`, `paddlepaddle`, `paddlex` installed for that Python (pins match `backend/requirements.txt`: `pip install paddleocr==3.7.0 paddlepaddle==3.3.1 paddlex==3.7.1`). The bundle script runs `paddleocr` locally to trigger the OCR model download, this is separate from the wheels that go into the bundle itself.
- On macOS/Linux, PowerShell Core (`pwsh`) is needed to run `bundle.ps1` (`brew install powershell`); on Windows, the built-in PowerShell is enough
- Internet access

### Target machine (Windows)
- Windows 10 / 11 (64-bit)
- **No Python required**: a Python runtime is bundled inside `python\`
- No internet required

### Target machine (Linux / macOS)
- Python 3.11+ installed and on `PATH`
- No internet required

---

## Windows

### Step 1: Build the Bundle (developer machine)

From the project root:

```powershell
.\scripts\bundle.ps1
```

This produces `dist\hvf-extractor-v<version>\` at the project root, where `<version>` is read from the [VERSION](../VERSION) file (e.g. `dist\hvf-extractor-v1.2.3\`). Copy the entire folder to the target machine (USB drive, network share, or zip it first).

**Optional flags:**

| Flag | Description |
|---|---|
| `-SkipWheels` | Reuse wheels already present in this version's bundle dir |
| `-SkipModels` | Reuse PaddleOCR models already present in this version's bundle dir |
| `-TargetPythonVersion X.Y.Z` | Override the Python version when dev and target differ |

Example: target machine has Python 3.12.9 but dev machine has a different version:
```powershell
.\scripts\bundle.ps1 -TargetPythonVersion 3.12.9
```

> **Python version matching:** Binary wheels (PyMuPDF, PaddlePaddle, aiohttp, etc.) are ABI-specific. The bundle auto-detects the dev machine's Python version and downloads matching wheels. Since the bundled Python runtime always ships alongside the wheels, the ABI always matches, so use `-TargetPythonVersion` when the target machine needs a different Python version than your dev machine.

**To zip before transfer:**
```powershell
Compress-Archive -Path dist\hvf-extractor-v1.2.3 -DestinationPath hvf-extractor-v1.2.3.zip
```

---

### Step 2: Install (target machine)

Open a Command Prompt inside the unzipped `hvf-extractor-v<version>\` folder and run:

```cmd
install.bat
```

This will:
1. Verify the bundled Python runtime (`python\python.exe`)
2. Install all dependencies from bundled wheels (no internet needed)
3. Prompt for an admin username and password
4. Write `backend\.env` with all configuration
5. Create required data directories (`data\uploads\`, `data\logs\`)

**If you prefer PowerShell:**
```powershell
.\install.ps1
```
> If you get an execution policy error, run this once first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

---

### Step 3: Run (target machine)

```cmd
start.bat
```

Or with PowerShell:
```powershell
.\start.ps1
```

Your browser opens automatically at `http://127.0.0.1:8000` once the app is ready.

---

## Linux / macOS

### Step 1: Build the Bundle (developer machine)

```bash
chmod +x scripts/bundle.sh
./scripts/bundle.sh
```

The script auto-detects your platform and Python version. Supported targets:

| OS | Architecture | Wheel platform |
|---|---|---|
| Linux | x86_64 | `manylinux_2_17_x86_64` |
| Linux | aarch64 | `manylinux_2_17_aarch64` |
| macOS | x86_64 | `macosx_12_0_x86_64` |
| macOS | arm64 | `macosx_12_0_arm64` |

**To archive before transfer:**
```bash
tar -czf hvf-extractor-v1.2.3.tar.gz -C dist hvf-extractor-v1.2.3/
```

**Optional flags:** `--skip-wheels`, `--skip-models`

---

### Step 2: Install (target machine)

```bash
chmod +x install.sh
./install.sh
```

This will:
1. Verify Python 3.11+ is on `PATH`
2. Create a virtual environment at `backend/.venv/`
3. Install all dependencies from bundled wheels (no internet needed)
4. Prompt for an admin username and password
5. Write `backend/.env` with all configuration
6. Create required data directories

---

### Step 3: Run (target machine)

```bash
./start.sh
```

Your browser opens automatically at `http://127.0.0.1:8000` once the app is ready.

---

## Bundle layout

```
dist\hvf-extractor-v<version>\
  install.bat              ← Windows installer (Command Prompt)
  install.ps1              ← Windows installer (PowerShell)
  start.bat                ← Windows launcher (Command Prompt)
  start.ps1                ← Windows launcher (PowerShell)
  uninstall.bat            ← Windows uninstaller (Command Prompt)
  uninstall.ps1            ← Windows uninstaller (PowerShell)
  setup_credentials.py     ← Called by install scripts to set credentials
  install.sh               ← Linux/macOS installer
  start.sh                 ← Linux/macOS launcher
  uninstall.sh             ← Linux/macOS uninstaller
  VERSION                  ← app version, read by the backend at startup
  wheels\                  ← Python wheel files (platform-specific)
  python\                  ← Bundled Python runtime (Windows only)
  backend\
    app\                   ← FastAPI source
    data\
      templates\           ← extraction templates
      models\det\          ← PaddleOCR detection model
      models\rec\          ← PaddleOCR recognition model
    static\                ← pre-built frontend
    requirements.txt
    .env.example
```

---

## Subsequent Launches

After the initial install, only `start.bat` / `start.ps1` / `start.sh` is needed. The `.env` persists between runs.

Your browser opens automatically at `http://127.0.0.1:8000` after starting.

---

## Notes

**No Python required on Windows target**

The Windows bundle includes a self-contained Python embeddable package (`python\python.exe`). The target machine needs no Python installation. The `.bat` / `.ps1` scripts use this bundled Python exclusively.

**The app only listens on localhost**

By default the server binds to `127.0.0.1:8000`. To allow LAN access, change `APP_HOST=0.0.0.0` in `backend\.env` and update `CORS_ORIGINS` to include the machine's IP, then restart.

**Changing credentials, or re-installing on a machine this bundle was copied to**

Admin credentials are only actually applied the first time `install.bat` / `install.ps1` / `install.sh` runs. Simply re-running install does **not** reset them, the database only seeds an admin user once, so a stale password from an earlier install (e.g. one that happened on a staging machine before this folder was copied here) stays in effect even after install writes a new `.env`. This is the single most common cause of "I set new credentials but the old ones still work, or nothing works."

To get a genuinely fresh install (new credentials, empty database, no leftover uploads/logs):
1. Stop the app if it's running.
2. Run `uninstall.bat` / `uninstall.ps1` / `uninstall.sh` and confirm.
3. Run the install script, then the start script as usual.

Uninstalling does not remove the Python runtime, dependencies, or application code, so this is fast and does not require re-copying or re-bundling anything.

**Data persistence**

- Uploaded PDFs are deleted automatically after extraction.
- The TinyDB database (`backend\data\database.json`) stores refresh token records and persists between restarts.
- Logs are written to `backend\data\logs\`.

**OCR models**

The bundle includes pre-downloaded PaddleOCR models (`data\models\det\` and `data\models\rec\`) for English text recognition. No internet access required on the target machine. Models are ~200–250 MB total.

**Re-bundling after code changes**

Re-run the bundle script on the developer machine after any code change. It always does a clean build, deleting the previous `dist\hvf-extractor-v<version>\` first. If you also bumped `VERSION`, the previous version's bundle dir is left untouched on disk under `dist\`, so remove it manually if you don't need it. Use `-SkipModels` / `--skip-models` to avoid re-downloading models if they haven't changed (only works when re-running against the same, not-yet-deleted version's bundle dir, see [docs/KNOWN-ISSUES.md](./KNOWN-ISSUES.md) for a caveat on this).
