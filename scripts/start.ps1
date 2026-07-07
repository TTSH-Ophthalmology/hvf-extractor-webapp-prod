# =============================================================================
# start.ps1 - Launch the HVF Extractor on an air-gapped Windows machine
# Usage: .\start.ps1  (run from inside the unzipped dist-bundle\ folder)
#
# Run install.ps1 first if you haven't already.
#
# If you get an execution policy error, run once as admin:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# =============================================================================

$ErrorActionPreference = "Stop"

$BUNDLE_DIR  = $PSScriptRoot
$BACKEND_DIR = "$BUNDLE_DIR\backend"
$VENV_PY     = "$BACKEND_DIR\.venv\Scripts\python.exe"

function Fail($msg) { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
if (-not (Test-Path $VENV_PY)) {
    Fail "Virtual environment not found. Run install.ps1 first."
}

if (-not (Test-Path "$BACKEND_DIR\.env")) {
    Fail ".env file not found. Run install.ps1 first."
}

# -----------------------------------------------------------------------------
# Launch
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  NHGEI HVF Extractor" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Open your browser at: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

# Set-Location to backend/ is required:
# - pydantic-settings resolves .env relative to CWD
# - all data/ paths in settings are relative to CWD
Set-Location $BACKEND_DIR

& $VENV_PY -m uvicorn app.main:app --host 127.0.0.1 --port 8000
