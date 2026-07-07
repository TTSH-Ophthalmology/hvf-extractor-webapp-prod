# =============================================================================
# install.ps1 - Set up the HVF Extractor on an air-gapped Windows machine
# Usage: .\install.ps1  (run from inside the unzipped dist-bundle\ folder)
#
# Requirements: Python 3.11+ installed and on PATH. No internet needed.
#
# If you get an execution policy error, run once as admin:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# =============================================================================

$ErrorActionPreference = "Stop"

$BUNDLE_DIR  = $PSScriptRoot
$BACKEND_DIR = "$BUNDLE_DIR\backend"
$VENV_DIR    = "$BACKEND_DIR\.venv"
$VENV_PY     = "$VENV_DIR\Scripts\python.exe"
$VENV_PIP    = "$VENV_DIR\Scripts\pip.exe"
$WHEELS_DIR  = "$BUNDLE_DIR\wheels"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[warn] $msg"  -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  NHGEI HVF Extractor - Installation" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. Check Python
# -----------------------------------------------------------------------------
Step "Checking Python"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Fail "Python not found in PATH. Install Python 3.11+ and re-run this script."
}

$pyVerStr = python --version 2>&1
Write-Host "  Found: $pyVerStr"

if ($pyVerStr -match "Python (\d+)\.(\d+)") {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
} else {
    Fail "Could not parse Python version from: $pyVerStr"
}

if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 9)) {
    Fail "Python 3.9 or higher is required. Found: $pyVerStr"
}
if ($major -eq 3 -and $minor -lt 11) {
    Warn "Python $major.$minor detected. Python 3.11+ is recommended."
    Warn "Some binary wheels may not be compatible. Installation will continue."
}

# -----------------------------------------------------------------------------
# 2. Create virtual environment
# -----------------------------------------------------------------------------
Step "Creating virtual environment"

if (Test-Path $VENV_DIR) {
    Warn "Virtual environment already exists at $VENV_DIR - skipping creation."
} else {
    python -m venv "$VENV_DIR"
    Write-Host "  Created: $VENV_DIR"
}

# -----------------------------------------------------------------------------
# 3. Install dependencies from bundled wheels (offline)
# -----------------------------------------------------------------------------
Step "Installing dependencies from bundled wheels (offline)"

& $VENV_PIP install `
    --no-index `
    --find-links "$WHEELS_DIR" `
    -r "$BACKEND_DIR\requirements.txt"

if ($LASTEXITCODE -ne 0) {
    Fail "pip install failed (exit $LASTEXITCODE). The wheels may not match this Python version ($pyVerStr). Re-run bundle.ps1 on the developer machine with the same Python version as this machine."
}
Write-Host "  Dependencies installed."

# -----------------------------------------------------------------------------
# 4. Prompt for admin credentials
# -----------------------------------------------------------------------------
Step "Configuring admin credentials"

$adminUser = Read-Host "  Enter admin username [default: admin]"
if ([string]::IsNullOrWhiteSpace($adminUser)) { $adminUser = "admin" }

$adminPassSecure = Read-Host "  Enter admin password" -AsSecureString
$adminPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassSecure)
)

Write-Host "  Hashing password..."
# Write password to a temp file (UTF-8, no BOM) so Python reads the exact bytes.
# Piping via PowerShell's | operator uses the console output encoding which can
# corrupt non-ASCII passwords or add unexpected bytes on some Windows setups.
$pwFile     = [System.IO.Path]::GetTempFileName()
$hashScript = [System.IO.Path]::GetTempFileName() + ".py"
[System.IO.File]::WriteAllText($pwFile, $adminPassPlain, [System.Text.UTF8Encoding]::new($false))

@'
import sys
from argon2 import PasswordHasher
with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    pw = fh.read()
print(PasswordHasher().hash(pw))
'@ | Set-Content -Path $hashScript -Encoding UTF8

try {
    $adminHash = (& $VENV_PY $hashScript $pwFile).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $adminHash) { Fail "Password hashing failed." }
} finally {
    Remove-Item $pwFile     -Force -ErrorAction SilentlyContinue
    Remove-Item $hashScript -Force -ErrorAction SilentlyContinue
}

# Clear plain-text password from memory
$adminPassPlain = $null

# -----------------------------------------------------------------------------
# 5. Generate JWT secret
# -----------------------------------------------------------------------------
Step "Generating JWT secret"

$jwtSecret = & $VENV_PY -c "import secrets; print(secrets.token_urlsafe(48))"
Write-Host "  JWT secret generated."

# -----------------------------------------------------------------------------
# 6. Write .env
# -----------------------------------------------------------------------------
Step "Writing backend\.env"

$envContent = @"
APP_ENV=production
APP_HOST=127.0.0.1
APP_PORT=8000

UPLOAD_DIR=./data/uploads
LOG_LEVEL=INFO
LOG_DIR=./data/logs
DATABASE_PATH=./data/database.json

CORS_ORIGINS=["http://127.0.0.1:8000"]

ADMIN_USERNAME=$adminUser
ADMIN_PASSWORD_HASH=$adminHash
JWT_SECRET_KEY=$jwtSecret
COOKIE_SECURE=false
"@

# Set-Content -Encoding UTF8 adds a BOM in PowerShell 5.x, which breaks
# pydantic-settings (first key becomes "\ufeffapp_env"). Use StreamWriter
# with explicit no-BOM UTF-8 instead.
[System.IO.File]::WriteAllText(
    "$BACKEND_DIR\.env",
    $envContent,
    [System.Text.UTF8Encoding]::new($false)
)
Write-Host "  Written: $BACKEND_DIR\.env"

# -----------------------------------------------------------------------------
# 7. Create required data directories
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
