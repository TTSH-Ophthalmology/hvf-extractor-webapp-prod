# =============================================================================
# uninstall.ps1 - Reset the HVF Extractor to a fresh, un-installed state
# Usage: .\uninstall.ps1  (run from inside the dist\hvf-extractor-v<version>\ folder)
#
# Removes all application state (admin credentials, database, uploaded
# files, logs) and the desktop shortcut, so install.ps1 can be re-run for a
# completely fresh install. Does NOT remove the bundled Python runtime,
# wheels, or application source - no need to re-copy the bundle afterward.
#
# Useful if this folder was copied from a machine where it was already
# installed/started (e.g. a staging environment) - re-running install.ps1
# alone does NOT reset the admin password, because the database only seeds
# an admin user once. Uninstalling first guarantees a truly fresh install.
# =============================================================================

$ErrorActionPreference = "Stop"

$BUNDLE_DIR  = $PSScriptRoot
$BACKEND_DIR = "$BUNDLE_DIR\backend"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  NHGEI HVF Extractor - Uninstall" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  This will permanently delete:"
Write-Host "    - Admin credentials (backend\.env)"
Write-Host "    - The database (backend\data\database.json) - all extraction history"
Write-Host "    - Uploaded files (backend\data\uploads\)"
Write-Host "    - Log files (backend\data\logs\)"
Write-Host "    - The desktop shortcut, if one was created"
Write-Host ""
Write-Host "  The Python runtime, dependencies, and application code are NOT removed."
Write-Host "  Run install.ps1 afterward for a fresh install without re-copying anything."
Write-Host ""
Write-Host "  Make sure the app is stopped first (close the start.ps1 window) -"
Write-Host "  some files below may be in use otherwise."
Write-Host ""

$confirm = Read-Host "  Type YES to continue"
if ($confirm -ne "YES") {
    Write-Host ""
    Write-Host "  Cancelled. Nothing was changed."
    exit 0
}

Step "Removing application state"

$envFile = "$BACKEND_DIR\.env"
if (Test-Path $envFile) {
    Remove-Item $envFile -Force
    Write-Host "  Removed: $envFile"
} else {
    Write-Host "  Not present: $envFile"
}

$dbFile = "$BACKEND_DIR\data\database.json"
if (Test-Path $dbFile) {
    Remove-Item $dbFile -Force
    Write-Host "  Removed: $dbFile"
} else {
    Write-Host "  Not present: $dbFile"
}

$uploadsDir = "$BACKEND_DIR\data\uploads"
if (Test-Path $uploadsDir) {
    Get-ChildItem $uploadsDir -File -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force
    Write-Host "  Cleared: $uploadsDir\"
}

$logsDir = "$BACKEND_DIR\data\logs"
if (Test-Path $logsDir) {
    Get-ChildItem $logsDir -File -ErrorAction SilentlyContinue | Remove-Item -Force
    Write-Host "  Cleared: $logsDir\"
}

Step "Removing desktop shortcut"

$shortcut = "$([Environment]::GetFolderPath('Desktop'))\NHGEI HVF Extractor.lnk"
if (Test-Path $shortcut) {
    Remove-Item $shortcut -Force
    Write-Host "  Removed: $shortcut"
} else {
    Write-Host "  Not present, nothing to remove."
}

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host "  Uninstall complete." -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Run install.ps1 to set up a fresh install."
Write-Host ""
