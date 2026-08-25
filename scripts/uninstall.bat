@echo off
:: =============================================================================
:: uninstall.bat - Reset the HVF Extractor to a fresh, un-installed state
:: Usage: uninstall.bat  (run from inside the dist\hvf-extractor-v<version>\ folder)
::
:: Removes all application state (admin credentials, database, uploaded
:: files, logs) and the desktop shortcut, so install.bat can be re-run for a
:: completely fresh install. Does NOT remove the bundled Python runtime,
:: wheels, or application source - no need to re-copy the bundle afterward.
::
:: Useful if this folder was copied from a machine where it was already
:: installed/started (e.g. a staging environment) - re-running install.bat
:: alone does NOT reset the admin password, because the database only seeds
:: an admin user once. Uninstalling first guarantees a truly fresh install.
:: =============================================================================

setlocal enabledelayedexpansion

set BUNDLE_DIR=%~dp0
if "%BUNDLE_DIR:~-1%"=="\" set BUNDLE_DIR=%BUNDLE_DIR:~0,-1%
set BACKEND_DIR=%BUNDLE_DIR%\backend

echo.
echo =============================================================================
echo   NHGEI HVF Extractor - Uninstall
echo =============================================================================
echo.
echo   This will permanently delete:
echo     - Admin credentials (backend\.env)
echo     - The database (backend\data\database.json) - all extraction history
echo     - Uploaded files (backend\data\uploads\)
echo     - Log files (backend\data\logs\)
echo     - The desktop shortcut, if one was created
echo.
echo   The Python runtime, dependencies, and application code are NOT removed.
echo   Run install.bat afterward for a fresh install without re-copying anything.
echo.
echo   Make sure the app is stopped first (close the start.bat window) -
echo   some files below may be in use otherwise.
echo.

set /p CONFIRM="  Type YES to continue: "
if /i not "%CONFIRM%"=="YES" (
    echo.
    echo   Cancelled. Nothing was changed.
    exit /b 0
)

echo.
echo ==^> Removing application state

if exist "%BACKEND_DIR%\.env" (
    del /f /q "%BACKEND_DIR%\.env" >nul 2>nul
    echo   Removed: %BACKEND_DIR%\.env
) else (
    echo   Not present: %BACKEND_DIR%\.env
)

if exist "%BACKEND_DIR%\data\database.json" (
    del /f /q "%BACKEND_DIR%\data\database.json" >nul 2>nul
    echo   Removed: %BACKEND_DIR%\data\database.json
) else (
    echo   Not present: %BACKEND_DIR%\data\database.json
)

if exist "%BACKEND_DIR%\data\uploads" (
    del /f /q /s "%BACKEND_DIR%\data\uploads\*" >nul 2>nul
    echo   Cleared: %BACKEND_DIR%\data\uploads\
)

if exist "%BACKEND_DIR%\data\logs" (
    del /f /q "%BACKEND_DIR%\data\logs\*" >nul 2>nul
    echo   Cleared: %BACKEND_DIR%\data\logs\
)

echo.
echo ==^> Removing desktop shortcut

set SHORTCUT=%USERPROFILE%\Desktop\NHGEI HVF Extractor.lnk
if exist "%SHORTCUT%" (
    del /f /q "%SHORTCUT%" >nul 2>nul
    echo   Removed: %SHORTCUT%
) else (
    echo   Not present, nothing to remove.
)

echo.
echo =============================================================================
echo   Uninstall complete.
echo =============================================================================
echo.
echo   Run install.bat to set up a fresh install.
echo.

endlocal
