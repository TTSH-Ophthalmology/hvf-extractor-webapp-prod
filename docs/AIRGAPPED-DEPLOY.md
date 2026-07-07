# Air-Gapped Deployment Guide

Deploy the HVF Extractor to a machine with no internet access, no Node.js, and no separate web server. The bundle includes a pre-built frontend served directly by the FastAPI backend.

---

## Requirements

### Developer machine (builds the bundle)
- Python 3.11+
- Node.js 20+ and npm
- Internet access

### Target machine (runs the app)
- Windows 10 / 11 (64-bit) **or** Linux / macOS
- Python 3.11+ installed and on `PATH`
- No internet required

---

## Windows

### Step 1 — Build the Bundle

From the project root:

```powershell
.\scripts\bundle.ps1
```

### Step 2 — Install (target machine)

Unzip the bundle, open PowerShell inside the unzipped folder, and run:

```powershell
.\install.ps1
```

If you get an execution policy error, run this once first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 3 — Run (target machine)

```powershell
.\start.ps1
```

---

## Linux / macOS

### Step 1 — Build the Bundle

Make the script executable and run from the project root:

```bash
chmod +x scripts/bundle.sh
./scripts/bundle.sh
```

The script auto-detects your platform and downloads matching wheels. Supported targets:

| OS | Architecture | Wheel platform |
|---|---|---|
| Linux | x86_64 | `manylinux_2_17_x86_64` |
| Linux | aarch64 | `manylinux_2_17_aarch64` |
| macOS | x86_64 | `macosx_12_0_x86_64` |
| macOS | arm64 | `macosx_12_0_arm64` |

### Step 2 — Install (target machine)

```bash
chmod +x install.sh
./install.sh
```

### Step 3 — Run (target machine)

```bash
./start.sh
```

---

## What the bundle + install steps do

**Bundle script (developer machine):**
1. Builds the React frontend with relative API URLs
2. Downloads all Python wheels for the target platform (offline-compatible)
3. Pre-downloads PaddleOCR detection and recognition models
4. Assembles everything into `dist-bundle/`

**Output layout:**
```
dist-bundle/
  install.ps1 / install.sh
  start.ps1   / start.sh
  wheels/                  ← Python wheel files
  backend/
    app/                   ← FastAPI source
    data/
      templates/           ← extraction templates
      models/det/          ← PaddleOCR detection model
      models/rec/          ← PaddleOCR recognition model
    static/                ← pre-built frontend
    requirements.txt
    .env.example
```

**Install script (target machine):**
1. Verifies Python version (3.11+ recommended)
2. Creates a virtual environment at `backend/.venv/`
3. Installs all dependencies from bundled wheels — no internet needed
4. Prompts for an admin username and password
5. Generates a JWT secret automatically
6. Writes `backend/.env` with all configuration
7. Creates required data directories

---

## Transferring the bundle

**Windows:**
```powershell
Compress-Archive -Path dist-bundle -DestinationPath hvf-bundle.zip
```

**Linux / macOS:**
```bash
tar -czf hvf-bundle.tar.gz dist-bundle/
```

---

## Subsequent Launches

After the initial install, only `start.ps1` / `start.sh` is needed. The virtual environment and `.env` persist between runs.

Open your browser at `http://127.0.0.1:8000` after starting.

---

## Notes

**Python version compatibility**

The bundle script auto-detects the Python version on the developer machine and downloads matching wheels (e.g. `cp312` for Python 3.12). Binary packages (e.g. PyMuPDF, PaddlePaddle, aiohttp) are ABI-specific and will only install on the exact same major.minor Python version. **The target machine must have the same Python major.minor version as the developer machine.** Python 3.11+ is strongly recommended.

**The app only listens on localhost**

By default the server binds to `127.0.0.1:8000`. To allow LAN access, change `APP_HOST=0.0.0.0` in `backend/.env` and update `CORS_ORIGINS` to include the machine's IP, then restart.

**Credentials**

Admin credentials are set once during `install.ps1` / `install.sh`. To change the password, re-run the install script (it skips venv creation and overwrites `.env`).

**Data persistence**

- Uploaded PDFs are deleted automatically after extraction.
- The TinyDB database (`backend/data/database.json`) stores refresh token records and persists between restarts.
- Logs are written to `backend/data/logs/`.

**OCR models**

The bundle includes pre-downloaded PaddleOCR models (`data/models/det/` and `data/models/rec/`) for English text recognition. Used exclusively for VRVF report extraction (~200–250 MB total). No internet access required on the target machine.

**Re-bundling after code changes**

Re-run the bundle script on the developer machine after any code change. It always does a clean build, deleting the previous `dist-bundle/` first. Models are re-downloaded each time unless restored from a previous bundle.
