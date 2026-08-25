#!/usr/bin/env bash
# =============================================================================
# install.sh - Set up the HVF Extractor on an air-gapped Unix machine
# Usage: ./install.sh  (run from inside the unzipped dist/hvf-extractor-v<version>/ folder)
#
# Requirements: Python 3.11+ installed and on PATH. No internet needed.
# =============================================================================

set -euo pipefail

BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BUNDLE_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
VENV_PY="$VENV_DIR/bin/python3"
VENV_PIP="$VENV_DIR/bin/pip"
WHEELS_DIR="$BUNDLE_DIR/wheels"
SETUP_CREDENTIALS="$BUNDLE_DIR/setup_credentials.py"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

step() { echo -e "\n${GREEN}==> $1${NC}"; }
warn() { echo -e "${YELLOW}[warn] $1${NC}"; }
fail() { echo -e "${RED}[error] $1${NC}"; exit 1; }

echo ""
echo -e "${CYAN}=============================================================================${NC}"
echo -e "${CYAN}  NHGEI HVF Extractor - Installation${NC}"
echo -e "${CYAN}=============================================================================${NC}"

# -----------------------------------------------------------------------------
# 1. Check Python
# -----------------------------------------------------------------------------
step "Checking Python"

command -v python3 >/dev/null 2>&1 || fail "python3 not found in PATH. Install Python 3.11+ and re-run."

PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)

echo "  Found: Python $PY_VER"

if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 9 ]; }; then
    fail "Python 3.9 or higher is required. Found: $PY_VER"
fi
if [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 11 ]; then
    warn "Python $PY_VER detected. Python 3.11+ is recommended. Some binary wheels may not be compatible."
fi

# -----------------------------------------------------------------------------
# 2. Create virtual environment
# -----------------------------------------------------------------------------
step "Creating virtual environment"

if [ -d "$VENV_DIR" ]; then
    warn "Virtual environment already exists at $VENV_DIR - skipping creation."
else
    python3 -m venv "$VENV_DIR"
    echo "  Created: $VENV_DIR"
fi

# -----------------------------------------------------------------------------
# 3. Install dependencies from bundled wheels (offline)
# -----------------------------------------------------------------------------
step "Installing dependencies from bundled wheels (offline)"

"$VENV_PIP" install \
    --no-index \
    --find-links "$WHEELS_DIR" \
    -r "$BACKEND_DIR/requirements.txt" \
    --no-warn-script-location \
    --quiet \
    || fail "pip install failed. The wheels may not match the venv's Python version."

echo "  Dependencies installed."

# -----------------------------------------------------------------------------
# 4. Configure credentials and write .env
# -----------------------------------------------------------------------------
step "Configuring admin credentials"

"$VENV_PY" "$SETUP_CREDENTIALS" "$BACKEND_DIR" || fail "Credential setup failed."

# -----------------------------------------------------------------------------
# 5. Create required data directories
# -----------------------------------------------------------------------------
step "Creating data directories"

for dir in "data/uploads" "data/logs"; do
    full_path="$BACKEND_DIR/$dir"
    if [ ! -d "$full_path" ]; then
        mkdir -p "$full_path"
        echo "  Created: $full_path"
    else
        echo "  Already exists: $full_path"
    fi
done

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=============================================================================${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}=============================================================================${NC}"
echo ""
echo "  To start the application, run:"
echo "    ./start.sh"
echo ""
echo "  Your browser will open automatically at: http://127.0.0.1:8000"
echo ""
