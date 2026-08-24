#!/usr/bin/env bash
# =============================================================================
# start.sh - Launch the HVF Extractor on an air-gapped Unix machine
# Usage: ./start.sh  (run from inside the unzipped dist-bundle-<version>/ folder)
#
# Run install.sh first if you haven't already.
# =============================================================================

set -euo pipefail

BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BUNDLE_DIR/backend"
VENV_PY="$BACKEND_DIR/.venv/bin/python3"
APP_URL="http://127.0.0.1:8000"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

fail() { echo -e "${RED}[error] $1${NC}"; exit 1; }

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
[ -f "$VENV_PY"           ] || fail "Virtual environment not found. Run install.sh first."
[ -f "$BACKEND_DIR/.env"  ] || fail ".env file not found. Run install.sh first."

# -----------------------------------------------------------------------------
# Launch
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}=============================================================================${NC}"
echo -e "${CYAN}  NHGEI HVF Extractor${NC}"
echo -e "${CYAN}=============================================================================${NC}"
echo ""
echo -e "  Opening your browser at: ${GREEN}${APP_URL}${NC}"
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop."
echo ""

# Wait for the server to accept connections, then open it in the default
# browser. Runs in the background so it doesn't block uvicorn below - OCR
# model loading on startup can take a while before the app is ready.
if command -v curl >/dev/null 2>&1; then
    (
        for _ in $(seq 1 90); do
            if curl -sf -o /dev/null "$APP_URL"; then
                if command -v open >/dev/null 2>&1; then
                    open "$APP_URL"                 # macOS
                elif command -v xdg-open >/dev/null 2>&1; then
                    xdg-open "$APP_URL"              # Linux
                fi
                break
            fi
            sleep 1
        done
    ) &
fi

# cd to backend/ so pydantic-settings resolves .env from CWD,
# and all relative data/ paths in settings work correctly.
cd "$BACKEND_DIR"
"$VENV_PY" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
