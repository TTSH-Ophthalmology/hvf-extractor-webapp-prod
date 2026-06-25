#!/usr/bin/env bash
# =============================================================================
# setup.sh — Dev environment setup for macOS / Linux
# Usage: bash scripts/setup.sh
# =============================================================================

set -e  # Exit immediately on error

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

step() { echo -e "\n${GREEN}==>${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
die()  { echo -e "${RED}[error]${NC} $1"; exit 1; }

# -----------------------------------------------------------------------------
# 1. Check required tools
# -----------------------------------------------------------------------------
step "Checking required tools"

command -v python3 &>/dev/null || die "Python 3 is not installed. Visit https://python.org"
command -v node   &>/dev/null || die "Node.js is not installed. Visit https://nodejs.org"
command -v npm    &>/dev/null || die "npm is not installed (should come with Node.js)"

PYTHON_VERSION=$(python3 -c 'import sys; print(sys.version_info[:2] >= (3,11))')
if [ "$PYTHON_VERSION" != "True" ]; then
  die "Python 3.11+ is required. Current: $(python3 --version)"
fi

echo "  Python : $(python3 --version)"
echo "  Node   : $(node --version)"
echo "  npm    : $(npm --version)"

# -----------------------------------------------------------------------------
# 2. Backend setup
# -----------------------------------------------------------------------------
step "Setting up backend"

cd "$ROOT_DIR/backend"

if [ ! -d ".venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv .venv
else
  echo "  Virtual environment already exists, skipping"
fi

echo "  Activating virtual environment..."
source .venv/bin/activate

echo "  Installing production dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

echo "  Installing dev dependencies..."
pip install --quiet -r requirements-dev.txt

if [ ! -f ".env" ]; then
  echo "  Copying .env.example → .env"
  cp .env.example .env
else
  warn ".env already exists, skipping copy"
fi

# Create uploads directory
mkdir -p data/uploads

deactivate

# -----------------------------------------------------------------------------
# 3. Frontend setup
# -----------------------------------------------------------------------------
step "Setting up frontend"

cd "$ROOT_DIR/frontend"

echo "  Installing Node dependencies..."
npm install --silent

if [ ! -f ".env" ]; then
  echo "  Copying .env.example → .env"
  cp .env.example .env
else
  warn ".env already exists, skipping copy"
fi

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
echo -e "\n${GREEN}✓ Setup complete!${NC}"
echo ""
echo "  To start the backend:"
echo "    cd backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "  To start the frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  Or use the VS Code 'Full Stack' debug configuration."
