@echo off
:: =============================================================================
:: install.bat - Set up the HVF Extractor on an air-gapped Windows machine
:: Usage: install.bat  (run from inside the dist-bundle-<version>\ folder)
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
    echo [error] pip install failed. The wheels may not match the bundled Python.
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
    echo [error] Credential setup failed.
    exit /b 1
)

:: -----------------------------------------------------------------------------
:: 4. Create required data directories
:: -----------------------------------------------------------------------------
echo.
echo ==^> Creating data directories

if not exist "%BACKEND_DIR%\data\uploads" (
    mkdir "%BACKEND_DIR%\data\uploads"
    echo   Created: %BACKEND_DIR%\data\uploads
) else (
    echo   Already exists: %BACKEND_DIR%\data\uploads
)

if not exist "%BACKEND_DIR%\data\logs" (
    mkdir "%BACKEND_DIR%\data\logs"
    echo   Created: %BACKEND_DIR%\data\logs
) else (
    echo   Already exists: %BACKEND_DIR%\data\logs
)

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
