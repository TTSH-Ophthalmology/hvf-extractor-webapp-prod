# =============================================================================
# install.ps1 - Set up the HVF Extractor on an air-gapped Windows machine
# Usage: .\install.ps1  (run from inside the unzipped dist-bundle\ folder)
#
# No Python installation required - a Python runtime is bundled in python\
#
# If you get an execution policy error, run once as admin:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# =============================================================================

$ErrorActionPreference = "Stop"

$BUNDLE_DIR  = $PSScriptRoot
$BACKEND_DIR = "$BUNDLE_DIR\backend"
$PYTHON_EXE  = "$BUNDLE_DIR\python\python.exe"
$WHEELS_DIR  = "$BUNDLE_DIR\wheels"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[warn] $msg"  -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  NHGEI HVF Extractor - Installation" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. Check bundled Python
# -----------------------------------------------------------------------------
Step "Checking bundled Python"

if (-not (Test-Path $PYTHON_EXE)) {
    Fail "Bundled Python not found at $PYTHON_EXE. Re-run bundle.ps1 on the developer machine."
}

$pyVerStr = & $PYTHON_EXE --version 2>&1
Write-Host "  Found: $pyVerStr (bundled)"

# -----------------------------------------------------------------------------
# 2. Install dependencies from bundled wheels (offline)
# -----------------------------------------------------------------------------
Step "Installing dependencies from bundled wheels (offline)"

& $PYTHON_EXE -m pip install `
    --no-index `
    --find-links "$WHEELS_DIR" `
    -r "$BACKEND_DIR\requirements.txt" `
    --no-warn-script-location `
    --quiet

if ($LASTEXITCODE -ne 0) {
    Fail "pip install failed (exit $LASTEXITCODE). Re-run bundle.ps1 on the developer machine."
}
Write-Host "  Dependencies installed."

# -----------------------------------------------------------------------------
# 3. Configure credentials and write .env
# -----------------------------------------------------------------------------
Step "Configuring admin credentials"

& $PYTHON_EXE "$BUNDLE_DIR\setup_credentials.py" "$BACKEND_DIR"
if ($LASTEXITCODE -ne 0) { Fail "Credential setup failed." }

# -----------------------------------------------------------------------------
# 4. Create required data directories
# -----------------------------------------------------------------------------
Step "Creating data directories"

foreach ($dir in @("data\uploads", "data\logs")) {
    $fullPath = "$BACKEND_DIR\$dir"
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  Created: $fullPath"
    } else {
        Write-Host "  Already exists: $fullPath"
    }
}

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To start the application, run:"
Write-Host "    .\start.ps1"
Write-Host ""
Write-Host "  Then open your browser at: http://127.0.0.1:8000"
Write-Host ""
