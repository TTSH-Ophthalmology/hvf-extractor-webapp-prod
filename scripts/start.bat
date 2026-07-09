@echo off
:: =============================================================================
:: start.bat - Launch the HVF Extractor on an air-gapped Windows machine
:: Usage: start.bat  (run from inside the dist-bundle\ folder)
::
:: Run install.bat first if you haven't already.
:: =============================================================================

set BUNDLE_DIR=%~dp0
set BACKEND_DIR=%BUNDLE_DIR%backend
set PYTHON_EXE=%BUNDLE_DIR%python\python.exe

if not exist "%PYTHON_EXE%" (
    echo [error] Bundled Python not found. Re-run bundle.ps1 on the developer machine.
    exit /b 1
)

if not exist "%BACKEND_DIR%\.env" (
    echo [error] .env file not found. Run install.bat first.
    exit /b 1
)

echo.
echo =============================================================================
echo   NHGEI HVF Extractor
echo =============================================================================
echo.
echo   Open your browser at: http://127.0.0.1:8000
echo   Press Ctrl+C to stop.
echo.

cd /d "%BACKEND_DIR%"
set PYTHONPATH=%BACKEND_DIR%
"%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
