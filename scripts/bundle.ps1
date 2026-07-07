# =============================================================================
# bundle.ps1 - Build and package the app for air-gapped deployment (Windows)
# Usage: .\scripts\bundle.ps1 [-SkipWheels] [-SkipModels]
#
#   -SkipWheels   Reuse wheels from a previous bundle run (skip download).
#   -SkipModels   Reuse PaddleOCR models from a previous bundle run.
#
# Runs on the DEVELOPER machine (requires internet, Node.js, Python).
# Produces: dist-bundle\ at the project root - zip and transfer to target.
#
# If you get an execution policy error, run once as admin:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# =============================================================================

param(
    [switch]$SkipWheels,
    [switch]$SkipModels
)

$ErrorActionPreference = "Stop"

$ROOT_DIR   = (Resolve-Path "$PSScriptRoot\..").Path
$BUNDLE_DIR = "$ROOT_DIR\dist-bundle"
$WHEELS_DIR = "$BUNDLE_DIR\wheels"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[warn] $msg"  -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  NHGEI HVF Extractor - Air-Gapped Bundle Builder" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. Check required tools
# -----------------------------------------------------------------------------
Step "Checking required tools"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) { Fail "Python not found in PATH." }
if (-not (Get-Command node   -ErrorAction SilentlyContinue)) { Fail "Node.js not found in PATH." }
if (-not (Get-Command npm    -ErrorAction SilentlyContinue)) { Fail "npm not found in PATH." }

$pyVerStr = python --version 2>&1
Write-Host "  Python : $pyVerStr"
Write-Host "  Node   : $(node --version)"
Write-Host "  npm    : $(npm --version)"

# Detect Python version for wheel download (must match the TARGET machine's Python).
if ($pyVerStr -match "Python (\d+)\.(\d+)") {
    $PY_MAJOR   = $Matches[1]
    $PY_MINOR   = $Matches[2]
    $PY_VERSION = "$PY_MAJOR.$PY_MINOR"       # e.g. "3.12"
    $PY_ABI     = "cp$PY_MAJOR$PY_MINOR"      # e.g. "cp312"
} else {
    Fail "Could not parse Python version from: $pyVerStr"
}

# -----------------------------------------------------------------------------
# 2. Clean previous bundle
# -----------------------------------------------------------------------------
Step "Cleaning previous bundle"

if (Test-Path $BUNDLE_DIR) {
    Remove-Item $BUNDLE_DIR -Recurse -Force
    Write-Host "  Removed existing dist-bundle\"
}
New-Item -ItemType Directory -Path $BUNDLE_DIR | Out-Null

# -----------------------------------------------------------------------------
# 3. Build frontend
# -----------------------------------------------------------------------------
Step "Building frontend (VITE_API_URL='' for same-origin relative API calls)"

Set-Location "$ROOT_DIR\frontend"

# Set VITE_API_URL to empty so all /api/* calls are relative to the serving
# origin. This avoids hardcoding localhost:8000 into the bundle.
$env:VITE_API_URL = ""

Write-Host "  Running npm ci..."
npm ci --silent

Write-Host "  Running npm run build..."
npm run build

if (-not (Test-Path "$ROOT_DIR\frontend\dist\index.html")) {
    Fail "Frontend build failed - dist\index.html not found."
}
Write-Host "  Frontend build successful."

# -----------------------------------------------------------------------------
# 4. Download Python wheels
# -----------------------------------------------------------------------------
if ($SkipWheels) {
    Step "Skipping wheel download (-SkipWheels)"
    if (-not (Test-Path $WHEELS_DIR)) {
        Fail "No wheels found at $WHEELS_DIR - cannot skip. Run without -SkipWheels first."
    }
    $wheelCount = (Get-ChildItem "$WHEELS_DIR\*.whl").Count
    Write-Host "  Reusing $wheelCount existing wheel(s)."
} else {
    Step "Downloading Python wheels (platform: win_amd64, python: $PY_VERSION)"
    New-Item -ItemType Directory -Path $WHEELS_DIR -Force | Out-Null

    # --only-binary :all:  refuses sdists that require a compiler on the target.
    # Python version is auto-detected from the current machine - the TARGET machine
    # must have the same Python major.minor version.
    # Note: uvloop has marker sys_platform != "win32" so it is correctly skipped.
    python -m pip download `
        --dest "$WHEELS_DIR" `
        --only-binary :all: `
        --platform win_amd64 `
        --python-version $PY_VERSION `
        --abi $PY_ABI `
        -r "$ROOT_DIR\backend\requirements.txt"

    $wheelCount = (Get-ChildItem "$WHEELS_DIR\*.whl").Count
    Write-Host "  Downloaded $wheelCount wheel(s)."
}

# -----------------------------------------------------------------------------
# 5. Pre-download PaddleOCR models
# -----------------------------------------------------------------------------
$MODELS_DIR = "$BUNDLE_DIR\backend\data\models"

if ($SkipModels) {
    Step "Skipping PaddleOCR model download (-SkipModels)"
    if (-not (Test-Path "$MODELS_DIR\det") -or -not (Test-Path "$MODELS_DIR\rec")) {
        Fail "No models found at $MODELS_DIR - cannot skip. Run without -SkipModels first."
    }
    $detFiles = (Get-ChildItem "$MODELS_DIR\det" -Recurse -File).Count
    $recFiles = (Get-ChildItem "$MODELS_DIR\rec" -Recurse -File).Count
    Write-Host "  Reusing existing models: det ($detFiles files), rec ($recFiles files)."
} else {
    Step "Pre-downloading PaddleOCR models (det + rec, lang=en)"
    New-Item -ItemType Directory -Path "$MODELS_DIR\det" -Force | Out-Null
    New-Item -ItemType Directory -Path "$MODELS_DIR\rec" -Force | Out-Null

    Write-Host "  Initialising PaddleOCR - this may take a few minutes on first run..."

# Write the download script to a temp file - PowerShell cannot pass a
# here-string directly as a python -c argument.
#
# PaddleOCR 3.x (PaddleX) always downloads models to ~/.paddlex/official_models/
# when no custom dir is given. Passing an empty directory raises FileNotFoundError
# because PaddleX requires inference.yml to already exist in any custom dir.
# Strategy: init without custom dirs (triggers download to PaddleX cache), then
# copy from the cache paths reported by the pipeline into the bundle dirs.
$tempScript = [System.IO.Path]::GetTempFileName() + ".py"
@'
import os, sys, shutil
from pathlib import Path
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"
from paddleocr import PaddleOCR

models_dir = Path(sys.argv[1])

# Init without custom dirs so PaddleX downloads to its default cache.
ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    lang="en",
)

# Locate where PaddleX stored the models via the pipeline object.
try:
    pipeline = ocr.paddlex_pipeline
    det_src = Path(pipeline._pipeline.text_det_model.model_dir)
    rec_src = Path(pipeline._pipeline.text_rec_model.model_dir)
except AttributeError:
    # Fallback: scan ~/.paddlex/official_models/ for det/rec dirs.
    cache = Path.home() / ".paddlex" / "official_models"
    candidates = [m for m in cache.iterdir() if (m / "inference.yml").exists()]
    det_candidates = [m for m in candidates if "det" in m.name.lower()]
    rec_candidates = [m for m in candidates if "rec" in m.name.lower()]
    if not det_candidates or not rec_candidates:
        print(f"ERROR: Could not locate models in {cache}", file=sys.stderr)
        sys.exit(1)
    det_src = det_candidates[0]
    rec_src = rec_candidates[0]

print(f"  Detection model source : {det_src}")
print(f"  Recognition model source: {rec_src}")

shutil.copytree(str(det_src), str(models_dir / "det"), dirs_exist_ok=True)
shutil.copytree(str(rec_src), str(models_dir / "rec"), dirs_exist_ok=True)
print("PaddleOCR models ready.")
'@ | Set-Content -Path $tempScript -Encoding UTF8

try {
    python $tempScript "$MODELS_DIR"
} finally {
    Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
}

    $detFiles = (Get-ChildItem "$MODELS_DIR\det" -Recurse -File).Count
    $recFiles = (Get-ChildItem "$MODELS_DIR\rec" -Recurse -File).Count
    if ($detFiles -eq 0 -or $recFiles -eq 0) {
        Fail "PaddleOCR model download appears incomplete (det=$detFiles files, rec=$recFiles files)."
    }
    Write-Host "  Models downloaded: det ($detFiles files), rec ($recFiles files)."
}

# -----------------------------------------------------------------------------
# 6. Assemble bundle
# -----------------------------------------------------------------------------
Step "Assembling bundle"

# Backend source
New-Item -ItemType Directory -Path "$BUNDLE_DIR\backend" -Force | Out-Null
Copy-Item "$ROOT_DIR\backend\app"               "$BUNDLE_DIR\backend\app"  -Recurse -Force
Copy-Item "$ROOT_DIR\backend\requirements.txt"  "$BUNDLE_DIR\backend\requirements.txt"
Copy-Item "$ROOT_DIR\backend\.env.example"      "$BUNDLE_DIR\backend\.env.example"

# Templates (required at runtime by the extraction pipeline)
New-Item -ItemType Directory -Path "$BUNDLE_DIR\backend\data\templates" -Force | Out-Null
Copy-Item "$ROOT_DIR\backend\data\templates\*" "$BUNDLE_DIR\backend\data\templates\" -Recurse

# Frontend build -> backend/static/ (served by FastAPI StaticFiles mount)
Copy-Item "$ROOT_DIR\frontend\dist" "$BUNDLE_DIR\backend\static" -Recurse

# Installer and launcher scripts
Copy-Item "$ROOT_DIR\scripts\install.ps1" "$BUNDLE_DIR\install.ps1"
Copy-Item "$ROOT_DIR\scripts\start.ps1"   "$BUNDLE_DIR\start.ps1"

Write-Host "  Bundle layout:"
Write-Host "    dist-bundle\"
Write-Host "      install.ps1"
Write-Host "      start.ps1"
Write-Host "      wheels\              ($wheelCount wheels)"
Write-Host "      backend\"
Write-Host "        app\"
Write-Host "        data\"
Write-Host "          templates\       (extraction templates)"
Write-Host "          models\det\      (PaddleOCR detection model)"
Write-Host "          models\rec\      (PaddleOCR recognition model)"
Write-Host "        static\            (frontend build)"
Write-Host "        requirements.txt"
Write-Host "        .env.example"

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host "  Bundle ready at: $BUNDLE_DIR" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:"
Write-Host "    1. Zip dist-bundle\ and transfer to the target machine."
Write-Host "    2. Unzip, then run:  .\install.ps1"
Write-Host "    3. To start the app: .\start.ps1"
Write-Host ""
