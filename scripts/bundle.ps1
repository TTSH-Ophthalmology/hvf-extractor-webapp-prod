# =============================================================================
# bundle.ps1 - Build and package the app for air-gapped deployment (Windows)
# Usage: .\scripts\bundle.ps1 [-SkipWheels] [-SkipModels] [-TargetPythonVersion <x.y.z>]
#
#   -SkipWheels              Reuse wheels from a previous bundle run (skip download).
#   -SkipModels              Reuse PaddleOCR models from a previous bundle run.
#   -TargetPythonVersion     Full Python version on the TARGET machine, e.g. "3.13.4".
#                            Defaults to the dev machine's Python version.
#                            Use this when dev and target have different Python versions.
#
# Runs on the DEVELOPER machine (requires internet, Node.js, Python).
# Produces: dist-bundle\ at the project root - zip and transfer to target.
#
# If you get an execution policy error, run once as admin:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# =============================================================================

param(
    [switch]$SkipWheels,
    [switch]$SkipModels,
    [string]$TargetPythonVersion = ""
)

$ErrorActionPreference = "Stop"

$ROOT_DIR   = (Resolve-Path "$PSScriptRoot\..").Path
$BUNDLE_DIR = "$ROOT_DIR\dist-bundle"
$WHEELS_DIR = "$BUNDLE_DIR\wheels"
$PYTHON_DIR = "$BUNDLE_DIR\python"

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

# Detect Python version (full X.Y.Z needed for embeddable package download URL).
if ($pyVerStr -match "Python (\d+)\.(\d+)\.(\d+)") {
    $PY_MAJOR    = $Matches[1]
    $PY_MINOR    = $Matches[2]
    $PY_PATCH    = $Matches[3]
    $PY_VERSION  = "$PY_MAJOR.$PY_MINOR"
    $PY_FULL_VER = "$PY_MAJOR.$PY_MINOR.$PY_PATCH"
    $PY_ABI      = "cp$PY_MAJOR$PY_MINOR"
} else {
    Fail "Could not parse Python version from: $pyVerStr"
}

# Allow overriding when dev and target Python versions differ.
# Requires full X.Y.Z — the patch version is needed for the embeddable download URL.
if ($TargetPythonVersion -ne "") {
    if ($TargetPythonVersion -match '^(\d+)\.(\d+)\.(\d+)$') {
        $parts       = $TargetPythonVersion -split '\.'
        $PY_MAJOR    = $parts[0]
        $PY_MINOR    = $parts[1]
        $PY_PATCH    = $parts[2]
        $PY_VERSION  = "$($parts[0]).$($parts[1])"
        $PY_FULL_VER = $TargetPythonVersion
        $PY_ABI      = "cp$($parts[0])$($parts[1])"
        Write-Host "  Target  : Python $PY_FULL_VER (overridden via -TargetPythonVersion)"
    } else {
        Fail "Invalid -TargetPythonVersion '$TargetPythonVersion'. Expected full version: '3.13.4'"
    }
} else {
    Write-Host "  Target  : Python $PY_FULL_VER (auto-detected from dev machine)"
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
# 5. Download Python embeddable package
# -----------------------------------------------------------------------------
Step "Downloading Python $PY_FULL_VER embeddable package"

$embedUrl = "https://www.python.org/ftp/python/$PY_FULL_VER/python-$PY_FULL_VER-embed-amd64.zip"
$embedZip = "$BUNDLE_DIR\python-embed.zip"

Write-Host "  Downloading: $embedUrl"
Invoke-WebRequest -Uri $embedUrl -OutFile $embedZip -UseBasicParsing

Write-Host "  Extracting to $PYTHON_DIR..."
New-Item -ItemType Directory -Path $PYTHON_DIR -Force | Out-Null
Expand-Archive -Path $embedZip -DestinationPath $PYTHON_DIR -Force
Remove-Item $embedZip -Force

# Enable site-packages by uncommenting '#import site' in the ._pth file.
# The embeddable package ships with this line commented out, which prevents
# pip-installed packages from being importable.
$pthFile = Get-ChildItem "$PYTHON_DIR\*._pth" | Select-Object -First 1
if (-not $pthFile) { Fail "Could not find ._pth file in embeddable package." }
$pthContent = (Get-Content $pthFile.FullName) -replace '#import site', 'import site'
[System.IO.File]::WriteAllLines($pthFile.FullName, $pthContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "  Enabled site-packages in $($pthFile.Name)"

# Bootstrap pip into the embeddable Python.
Write-Host "  Bootstrapping pip..."
$getPipScript = "$env:TEMP\hvf_get_pip.py"
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPipScript -UseBasicParsing
& "$PYTHON_DIR\python.exe" $getPipScript --no-warn-script-location --quiet
if ($LASTEXITCODE -ne 0) { Fail "Failed to bootstrap pip into embeddable Python." }
Remove-Item $getPipScript -Force -ErrorAction SilentlyContinue
Write-Host "  Bundled Python ready: python $PY_FULL_VER + pip"

# -----------------------------------------------------------------------------
# 6. Pre-download PaddleOCR models
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
# 7. Assemble bundle
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
Copy-Item "$ROOT_DIR\scripts\install.bat"          "$BUNDLE_DIR\install.bat"
Copy-Item "$ROOT_DIR\scripts\setup_credentials.py" "$BUNDLE_DIR\setup_credentials.py"
Copy-Item "$ROOT_DIR\scripts\start.bat"            "$BUNDLE_DIR\start.bat"

Write-Host "  Bundle layout:"
Write-Host "    dist-bundle\"
Write-Host "      install.bat"
Write-Host "      start.bat"
Write-Host "      setup_credentials.py"
Write-Host "      wheels\              ($wheelCount wheels)"
Write-Host "      python\              (Python $PY_FULL_VER embeddable + pip)"
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
Write-Host "  Next steps (air-gapped install on target machine):"
Write-Host "    1. Copy the entire dist-bundle\ folder to the target machine (USB or zip)."
Write-Host "    2. On the target machine, open a Command Prompt inside dist-bundle\."
Write-Host "    3. Run:  install.bat"
Write-Host "       (sets up dependencies, prompts for admin credentials)"
Write-Host "    4. Run:  start.bat"
Write-Host "       (launches the app at http://127.0.0.1:8000)"
Write-Host ""
Write-Host "    NOTE: No Python required on the target - Python $PY_FULL_VER is bundled."
Write-Host "    NOTE: Built for target Python $PY_FULL_VER / win_amd64."
Write-Host ""
