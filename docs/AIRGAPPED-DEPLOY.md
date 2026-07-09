# Air-Gapped Deployment Guide

Deploy the HVF Extractor to a machine with no internet access, no Node.js, and no separate web server. The bundle includes a pre-built frontend served directly by the FastAPI backend.

---

## Requirements

### Developer machine (builds the bundle)
- Python 3.11+ (3.12+ recommended)
- Node.js 20+ and npm
- Internet access

### Target machine — Windows
- Windows 10 / 11 (64-bit)
- **No Python required** — a Python runtime is bundled inside `python\`
- No internet required

### Target machine — Linux / macOS
- Python 3.11+ installed and on `PATH`
- No internet required

---

## Windows

### Step 1 — Build the Bundle (developer machine)

From the project root:

```powershell
.\scripts\bundle.ps1
```

This produces `dist-bundle\` at the project root. Copy the entire folder to the target machine (USB drive, network share, or zip it first).

**Optional flags:**

| Flag | Description |
|---|---|
| `-SkipWheels` | Reuse wheels from a previous bundle run |
| `-SkipModels` | Reuse PaddleOCR models from a previous bundle run |
| `-TargetPythonVersion X.Y.Z` | Override the Python version when dev and target differ |

Example — target machine has Python 3.12.9 but dev machine has a different version:
```powershell
.\scripts\bundle.ps1 -TargetPythonVersion 3.12.9
```

> **Python version matching:** Binary wheels (PyMuPDF, PaddlePaddle, aiohttp, etc.) are ABI-specific. The bundle auto-detects the dev machine's Python version and downloads matching wheels. If your target machine uses the bundled Python (default), the ABI always matches. If you use `install_312.bat` with your own Python, ensure the bundle was built targeting that version.

**To zip before transfer:**
```powershell
Compress-Archive -Path dist-bundle -DestinationPath hvf-bundle.zip
```

---

### Step 2 — Install (target machine)

Open a Command Prompt inside the unzipped `dist-bundle\` folder and run:

```cmd
install.bat
```

This will:
1. Verify the bundled Python runtime (`python\python.exe`)
2. Install all dependencies from bundled wheels — no internet needed
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

### Step 3 — Run (target machine)

```cmd
start.bat
```

Or with PowerShell:
```powershell
.\start.ps1
```

Open your browser at `http://127.0.0.1:8000`.

---

### Using an existing Python 3.12 installation

If the target machine already has Python 3.12 installed at a known path (e.g. an embeddable package), use the `_312` variants instead.

1. Open `install_312.bat` and `start_312.bat` in a text editor.
2. Change the `PYTHON_EXE` line at the top to match the path on the target machine:
   ```batch
   set PYTHON_EXE=C:\Python312\python.exe
   ```
3. Run:
   ```cmd
   install_312.bat
   start_312.bat
   ```

> Make sure the bundle was built with `-TargetPythonVersion` matching that Python version (e.g. `3.12.9`).

---

## Linux / macOS

### Step 1 — Build the Bundle (developer machine)

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
tar -czf hvf-bundle.tar.gz dist-bundle/
```

**Optional flags:** `--skip-wheels`, `--skip-models`

---

### Step 2 — Install (target machine)

```bash
chmod +x install.sh
./install.sh
```

This will:
1. Verify Python 3.11+ is on `PATH`
2. Create a virtual environment at `backend/.venv/`
3. Install all dependencies from bundled wheels — no internet needed
4. Prompt for an admin username and password
5. Write `backend/.env` with all configuration
6. Create required data directories

---

### Step 3 — Run (target machine)

```bash
./start.sh
```

Open your browser at `http://127.0.0.1:8000`.

---

## Bundle layout

```
dist-bundle\
  install.bat              ← Windows installer (Command Prompt)
  install.ps1              ← Windows installer (PowerShell)
  install_312.bat          ← Windows installer using existing Python 3.12
  start.bat                ← Windows launcher (Command Prompt)
  start.ps1                ← Windows launcher (PowerShell)
  start_312.bat            ← Windows launcher using existing Python 3.12
  setup_credentials.py     ← Called by install scripts to set credentials
  install.sh               ← Linux/macOS installer
  start.sh                 ← Linux/macOS launcher
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

Open your browser at `http://127.0.0.1:8000` after starting.

---

## Notes

**No Python required on Windows target**

The Windows bundle includes a self-contained Python embeddable package (`python\python.exe`). The target machine needs no Python installation. The `.bat` / `.ps1` scripts use this bundled Python exclusively.

**The app only listens on localhost**

By default the server binds to `127.0.0.1:8000`. To allow LAN access, change `APP_HOST=0.0.0.0` in `backend\.env` and update `CORS_ORIGINS` to include the machine's IP, then restart.

**Changing credentials**

Admin credentials are set once during `install.bat` / `install.ps1` / `install.sh`. To change them:
1. Re-run the install script — it overwrites `.env` with new credentials.
2. Delete `backend\data\database.json` so the database re-seeds with the new password hash on next start.
3. Run the start script.

**Data persistence**

- Uploaded PDFs are deleted automatically after extraction.
- The TinyDB database (`backend\data\database.json`) stores refresh token records and persists between restarts.
- Logs are written to `backend\data\logs\`.

**OCR models**

The bundle includes pre-downloaded PaddleOCR models (`data\models\det\` and `data\models\rec\`) for English text recognition. No internet access required on the target machine. Models are ~200–250 MB total.

**Re-bundling after code changes**

Re-run the bundle script on the developer machine after any code change. It always does a clean build, deleting the previous `dist-bundle\` first. Use `-SkipModels` / `--skip-models` to avoid re-downloading models if they haven't changed.
