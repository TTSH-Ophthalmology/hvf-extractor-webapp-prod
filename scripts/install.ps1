# =============================================================================
# install.ps1 - Set up the HVF Extractor on an air-gapped Windows machine
# Usage: .\install.ps1  (run from inside the unzipped dist\hvf-extractor-v<version>\ folder)
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
$ICON_PATH   = "$BUNDLE_DIR\icon.ico"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[warn] $msg"  -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  NHGEI HVF Extractor - Installation" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 0. Check for risky install locations (best-effort, non-fatal)
# -----------------------------------------------------------------------------
try {
    $driveLetter = (Get-Item $BUNDLE_DIR).PSDrive.Name
    $driveType = (Get-Volume -DriveLetter $driveLetter -ErrorAction SilentlyContinue).DriveType
    if ($driveType -eq "Removable") {
        Warn "This folder is on a removable drive ($driveLetter`:). If it gets unplugged, the app will fail. Consider copying to a local folder like C:\HVF-Extractor first."
    }
} catch {}

$downloadsPath = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
if ($BUNDLE_DIR -like "$downloadsPath*") {
    Warn "Running from a Downloads folder. Consider moving to a local folder like C:\HVF-Extractor first - some antivirus/security tools treat Downloads specially and may interfere."
}

if ($env:OneDrive -and $BUNDLE_DIR.StartsWith($env:OneDrive)) {
    Warn "Running from a OneDrive-synced folder. OneDrive can lock files while syncing, which may interfere with install or start. Consider moving to a local folder like C:\HVF-Extractor first."
}

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
    Fail "pip install failed (exit $LASTEXITCODE). This can also happen if antivirus or a security policy denied access to a wheel or the python\ folder. Re-run bundle.ps1 on the developer machine."
}
Write-Host "  Dependencies installed."

# -----------------------------------------------------------------------------
# 3. Configure credentials and write .env
# -----------------------------------------------------------------------------
Step "Configuring admin credentials"

& $PYTHON_EXE "$BUNDLE_DIR\setup_credentials.py" "$BACKEND_DIR"
if ($LASTEXITCODE -ne 0) {
    Fail "Credential setup failed. If this says 'Access is denied', the bundle folder may be read-only or blocked by policy - try copying it to a local folder like C:\HVF-Extractor first."
}

# -----------------------------------------------------------------------------
# 4. Create required data directories
# -----------------------------------------------------------------------------
Step "Creating data directories"

$dirError = $false
foreach ($dir in @("data\uploads", "data\logs")) {
    $fullPath = "$BACKEND_DIR\$dir"
    if (-not (Test-Path $fullPath)) {
        try {
            New-Item -ItemType Directory -Path $fullPath -Force -ErrorAction Stop | Out-Null
            Write-Host "  Created: $fullPath"
        } catch {
            Warn "Could not create $fullPath - $($_.Exception.Message)"
            $dirError = $true
        }
    } else {
        Write-Host "  Already exists: $fullPath"
    }
}

if ($dirError) {
    Warn "One or more data folders could not be created. The app may fail to start. Check folder permissions or move the bundle to a local folder you own, e.g. C:\HVF-Extractor\"
}

# -----------------------------------------------------------------------------
# 5. Create a desktop shortcut with a custom icon (best-effort, non-fatal)
# -----------------------------------------------------------------------------
Step "Creating desktop shortcut"

if (-not (Test-Path $ICON_PATH)) {
    Warn "icon.ico not found in bundle - skipping desktop shortcut."
} else {
    try {
        $desktop = [Environment]::GetFolderPath("Desktop")
        $lnkPath = "$desktop\NHGEI HVF Extractor.lnk"
        $newTarget = "$BUNDLE_DIR\start.bat"
        $ws = New-Object -ComObject WScript.Shell

        if (Test-Path $lnkPath) {
            $existing = $ws.CreateShortcut($lnkPath)
            if ($existing.TargetPath -and ($existing.TargetPath -ne $newTarget)) {
                Warn "An existing shortcut pointed to a different install: $($existing.TargetPath)"
                Warn "It will now point here instead. The older install still works if launched directly."
            }
        }

        $lnk = $ws.CreateShortcut($lnkPath)
        $lnk.TargetPath = $newTarget
        $lnk.WorkingDirectory = $BUNDLE_DIR
        $lnk.IconLocation = $ICON_PATH
        $lnk.Description = "NHGEI HVF Extractor"
        $lnk.Save()
        Write-Host "  Created: $lnkPath"
    } catch {
        Warn "Could not create desktop shortcut - access denied to Desktop? $($_.Exception.Message)"
        Warn "You can create one manually: right-click start.bat -> Create shortcut, then set the icon to icon.ico in Properties."
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
Write-Host "  Your browser will open automatically at: http://127.0.0.1:8000"
Write-Host ""
