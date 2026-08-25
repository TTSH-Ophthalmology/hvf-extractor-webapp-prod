@echo off
:: =============================================================================
:: install.bat - Set up the HVF Extractor on an air-gapped Windows machine
:: Usage: install.bat  (run from inside the dist\hvf-extractor-v<version>\ folder)
::
:: No Python installation required - a Python runtime is bundled in python\
:: =============================================================================

setlocal enabledelayedexpansion

set BUNDLE_DIR=%~dp0
:: Remove trailing backslash added by %~dp0
if "%BUNDLE_DIR:~-1%"=="\" set BUNDLE_DIR=%BUNDLE_DIR:~0,-1%

set BACKEND_DIR=%BUNDLE_DIR%\backend
set PYTHON_EXE=%BUNDLE_DIR%\python\python.exe
set WHEELS_DIR=%BUNDLE_DIR%\wheels
set ICON_PATH=%BUNDLE_DIR%\icon.ico

echo.
echo =============================================================================
echo   NHGEI HVF Extractor - Installation
echo =============================================================================

:: -----------------------------------------------------------------------------
:: 1. Check bundled Python
:: -----------------------------------------------------------------------------
echo.
echo ==^> Checking bundled Python

if not exist "%PYTHON_EXE%" (
    echo [error] Bundled Python not found at %PYTHON_EXE%
    echo         Re-run bundle.ps1 on the developer machine.
    exit /b 1
)

for /f "tokens=2" %%v in ('"%PYTHON_EXE%" --version 2^>^&1') do set PY_VER=%%v
echo   Found: Python %PY_VER% (bundled)

:: -----------------------------------------------------------------------------
:: 2. Install dependencies from bundled wheels (offline)
:: -----------------------------------------------------------------------------
echo.
echo ==^> Installing dependencies from bundled wheels (offline)

"%PYTHON_EXE%" -m pip install ^
    --no-index ^
    --find-links "%WHEELS_DIR%" ^
    -r "%BACKEND_DIR%\requirements.txt" ^
    --no-warn-script-location ^
    --quiet

if errorlevel 1 (
    echo [error] pip install failed. This can also happen if antivirus or a
    echo         security policy denied access to a wheel or the python\ folder.
    echo         The wheels may not match the bundled Python.
    echo         Re-run bundle.ps1 on the developer machine.
    exit /b 1
)
echo   Dependencies installed.

:: -----------------------------------------------------------------------------
:: 3. Configure credentials and write .env
:: -----------------------------------------------------------------------------
echo.
echo ==^> Configuring admin credentials

"%PYTHON_EXE%" "%BUNDLE_DIR%\setup_credentials.py" "%BACKEND_DIR%"
if errorlevel 1 (
    echo [error] Credential setup failed. If this says "Access is denied",
    echo         the bundle folder may be read-only or blocked by policy -
    echo         try copying it to a local folder like C:\HVF-Extractor first.
    exit /b 1
)

:: -----------------------------------------------------------------------------
:: 4. Create required data directories
:: -----------------------------------------------------------------------------
echo.
echo ==^> Creating data directories

set DIR_ERROR=0

if not exist "%BACKEND_DIR%\data\uploads" (
    mkdir "%BACKEND_DIR%\data\uploads" 2>nul
    if not exist "%BACKEND_DIR%\data\uploads" (
        echo [warn] Could not create %BACKEND_DIR%\data\uploads - access denied?
        set DIR_ERROR=1
    ) else (
        echo   Created: %BACKEND_DIR%\data\uploads
    )
) else (
    echo   Already exists: %BACKEND_DIR%\data\uploads
)

if not exist "%BACKEND_DIR%\data\logs" (
    mkdir "%BACKEND_DIR%\data\logs" 2>nul
    if not exist "%BACKEND_DIR%\data\logs" (
        echo [warn] Could not create %BACKEND_DIR%\data\logs - access denied?
        set DIR_ERROR=1
    ) else (
        echo   Created: %BACKEND_DIR%\data\logs
    )
) else (
    echo   Already exists: %BACKEND_DIR%\data\logs
)

if "%DIR_ERROR%"=="1" (
    echo.
    echo [warn] One or more data folders could not be created. The app may
    echo        fail to start. Check folder permissions or move the bundle
    echo        to a local folder you own, e.g. C:\HVF-Extractor\
)

:: -----------------------------------------------------------------------------
:: 5. Create a desktop shortcut with a custom icon (best-effort, non-fatal)
:: -----------------------------------------------------------------------------
echo.
echo ==^> Creating desktop shortcut

where powershell >nul 2>nul
if errorlevel 1 (
    echo [warn] PowerShell not found - skipping desktop shortcut.
    echo        You can still launch the app via start.bat directly.
    goto :skip_shortcut
)

if not exist "%ICON_PATH%" (
    echo [warn] icon.ico not found in bundle - skipping desktop shortcut.
    goto :skip_shortcut
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$lnkPath = $env:USERPROFILE + '\Desktop\NHGEI HVF Extractor.lnk'; $newTarget = '%BUNDLE_DIR%\start.bat'; try { $ws = New-Object -ComObject WScript.Shell; if (Test-Path $lnkPath) { $existing = $ws.CreateShortcut($lnkPath); if ($existing.TargetPath -and ($existing.TargetPath -ne $newTarget)) { Write-Host ('  [warn] An existing shortcut pointed to a different install: ' + $existing.TargetPath); Write-Host '  [warn] It will now point here instead. The older install still works if launched directly.' } }; $lnk = $ws.CreateShortcut($lnkPath); $lnk.TargetPath = $newTarget; $lnk.WorkingDirectory = '%BUNDLE_DIR%'; $lnk.IconLocation = '%ICON_PATH%'; $lnk.Description = 'NHGEI HVF Extractor'; $lnk.Save() } catch { Write-Host $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo [warn] Could not create desktop shortcut - access denied to Desktop?
    echo        You can create one manually: right-click start.bat -^>
    echo        Create shortcut, then set the icon to icon.ico in Properties.
) else (
    echo   Created: Desktop\NHGEI HVF Extractor.lnk
)

:skip_shortcut

:: -----------------------------------------------------------------------------
:: Done
:: -----------------------------------------------------------------------------
echo.
echo =============================================================================
echo   Installation complete!
echo =============================================================================
echo.
echo   To start the application, run:
echo     start.bat
echo.
echo   Your browser will open automatically at: http://127.0.0.1:8000
echo.

endlocal
