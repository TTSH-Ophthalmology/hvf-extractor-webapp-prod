# =============================================================================
# setup.ps1 - Dev environment setup for Windows (PowerShell)
# Usage: .\scripts\setup.ps1
#
# If you get an execution policy error, run once as admin:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# =============================================================================

$ErrorActionPreference = "Stop"

$ROOT_DIR   = Resolve-Path "$PSScriptRoot\.."
$VENV_DIR   = "$ROOT_DIR\backend\.venv"
$VENV_PY    = "$VENV_DIR\Scripts\python.exe"

function Step($msg)  { Write-Host "`n==> $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "[warn] $msg"  -ForegroundColor Yellow }
function Fail($msg)  { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  NHGEI HVF Extractor - Dev Environment Setup" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. Check required tools
# -----------------------------------------------------------------------------
Step "Checking required tools"

if (-not (Get-Command python  -ErrorAction SilentlyContinue)) { Fail "Python not found. Visit https://python.org" }
if (-not (Get-Command node    -ErrorAction SilentlyContinue)) { Fail "Node.js not found. Visit https://nodejs.org" }
if (-not (Get-Command npm     -ErrorAction SilentlyContinue)) { Fail "npm not found. Should come bundled with Node.js." }

$pythonVer = python --version
$nodeVer   = node --version
$npmVer    = npm --version

Write-Host "  Python : $pythonVer"
Write-Host "  Node   : $nodeVer"
Write-Host "  npm    : $npmVer"

# -----------------------------------------------------------------------------
# 2. Backend setup
# -----------------------------------------------------------------------------
Step "Setting up backend"

Set-Location "$ROOT_DIR\backend"

if (-not (Test-Path $VENV_DIR)) {
    Write-Host "  Creating virtual environment..."
    python -m venv .venv
} else {
    Warn "Virtual environment already exists, skipping."
}

Write-Host "  Upgrading pip..."
& $VENV_PY -m pip install --quiet --upgrade pip

Write-Host "  Installing production dependencies..."
& $VENV_PY -m pip install --quiet -r requirements.txt

Write-Host "  Installing dev dependencies..."
& $VENV_PY -m pip install --quiet -r requirements-dev.txt

if (-not (Test-Path ".env")) {
    Write-Host "  Copying .env.example to .env"
    Copy-Item .env.example .env
} else {
    Warn ".env already exists, skipping copy."
}

if (-not (Test-Path "data\uploads")) {
    New-Item -ItemType Directory -Path "data\uploads" -Force | Out-Null
}

# -----------------------------------------------------------------------------
# 3. Frontend setup
# -----------------------------------------------------------------------------
Step "Setting up frontend"

Set-Location "$ROOT_DIR\frontend"

Write-Host "  Installing Node dependencies..."
npm install

if (-not (Test-Path ".env")) {
    Write-Host "  Copying .env.example to .env"
    Copy-Item .env.example .env
} else {
    Warn ".env already exists, skipping copy."
}

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To start the backend:"
Write-Host "    cd backend"
Write-Host "    .venv\Scripts\Activate.ps1"
Write-Host "    uvicorn app.main:app --reload"
Write-Host ""
Write-Host "  To start the frontend:"
Write-Host "    cd frontend"
Write-Host "    npm run dev"
Write-Host ""
Write-Host "  Or use the VS Code 'Full Stack' debug configuration."
Write-Host ""
