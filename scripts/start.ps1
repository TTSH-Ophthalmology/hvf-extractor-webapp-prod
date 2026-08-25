# =============================================================================
# start.ps1 - Launch the HVF Extractor on an air-gapped Windows machine
# Usage: .\start.ps1  (run from inside the unzipped dist\hvf-extractor-v<version>\ folder)
#
# Run install.ps1 first if you haven't already.
# =============================================================================

$ErrorActionPreference = "Stop"

$BUNDLE_DIR  = $PSScriptRoot
$BACKEND_DIR = "$BUNDLE_DIR\backend"
$PYTHON_EXE  = "$BUNDLE_DIR\python\python.exe"
$APP_URL     = "http://127.0.0.1:8000"

function Fail($msg) { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
if (-not (Test-Path $PYTHON_EXE)) {
    Fail "Bundled Python not found. Re-run bundle.ps1 on the developer machine."
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
Write-Host "  Opening your browser at: $APP_URL" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

# Wait for the server to accept connections, then open it in the default
# browser. Runs as a background job so it doesn't block uvicorn below - OCR
# model loading on startup can take a while before the app is ready.
Start-Job -ScriptBlock {
    param($url)
    for ($i = 0; $i -lt 90; $i++) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1 | Out-Null
            Start-Process $url
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
} -ArgumentList $APP_URL | Out-Null

# Set-Location to backend/ is required:
# - pydantic-settings resolves .env relative to CWD
# - all data/ paths in settings are relative to CWD
Set-Location $BACKEND_DIR

& $PYTHON_EXE -m uvicorn app.main:app --host 127.0.0.1 --port 8000
