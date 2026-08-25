@echo off
:: =============================================================================
:: start.bat - Launch the HVF Extractor on an air-gapped Windows machine
:: Usage: start.bat  (run from inside the dist\hvf-extractor-v<version>\ folder)
::
:: Run install.bat first if you haven't already.
:: =============================================================================

set BUNDLE_DIR=%~dp0
set BACKEND_DIR=%BUNDLE_DIR%backend
set PYTHON_EXE=%BUNDLE_DIR%python\python.exe
set APP_URL=http://127.0.0.1:8000

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
echo   Opening your browser at: %APP_URL%
echo   Press Ctrl+C to stop.
echo.

:: Wait for the server to accept connections, then open it in the default
:: browser. Runs detached so it doesn't block uvicorn below - OCR model
:: loading on startup can take a while before the app is ready. If it never
:: comes up within the window, pop up a message instead of failing silently
:: (this runs in a hidden window, so a console message alone would never be
:: seen).
start "" powershell -NoProfile -WindowStyle Hidden -Command "$ok = $false; for ($i=0; $i -lt 180; $i++) { try { Invoke-WebRequest -Uri '%APP_URL%' -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process '%APP_URL%'; $ok = $true; break } catch { Start-Sleep -Seconds 1 } }; if (-not $ok) { Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('The app is taking longer than 3 minutes to start. It may still be loading (this can happen on slower machines) - open %APP_URL% manually once ready, or check the start.bat window for errors.', 'NHGEI HVF Extractor') | Out-Null }"

cd /d "%BACKEND_DIR%"
set PYTHONPATH=%BACKEND_DIR%
"%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
