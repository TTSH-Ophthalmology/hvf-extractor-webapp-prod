#!/usr/bin/env bash
# =============================================================================
# bundle.sh - Build and package the app for air-gapped deployment (Unix)
# Usage: ./scripts/bundle.sh [--skip-wheels] [--skip-models]
#
#   --skip-wheels   Reuse wheels already present in this version's bundle dir (skip download).
#   --skip-models   Reuse PaddleOCR models already present in this version's bundle dir.
#
# Runs on the DEVELOPER machine (requires internet, Node.js, Python).
# Produces: dist/hvf-extractor-v<version>/ at the project root - tar/zip and transfer to target.
# The version comes from the VERSION file at the project root.
# =============================================================================

set -euo pipefail

SKIP_WHEELS=false
SKIP_MODELS=false

for arg in "$@"; do
    case $arg in
        --skip-wheels) SKIP_WHEELS=true ;;
        --skip-models) SKIP_MODELS=true ;;
        *) echo "Unknown argument: $arg"; exit 1 ;;
    esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_VERSION="$(tr -d '[:space:]' < "$ROOT_DIR/VERSION")"
BUNDLE_NAME="hvf-extractor-v$APP_VERSION"
BUNDLE_DIR="$ROOT_DIR/dist/$BUNDLE_NAME"
WHEELS_DIR="$BUNDLE_DIR/wheels"
MODELS_DIR="$BUNDLE_DIR/backend/data/models"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

step() { echo -e "\n${GREEN}==> $1${NC}"; }
warn() { echo -e "${YELLOW}[warn] $1${NC}"; }
fail() { echo -e "${RED}[error] $1${NC}"; exit 1; }

echo ""
echo -e "${CYAN}=============================================================================${NC}"
echo -e "${CYAN}  NHGEI HVF Extractor - Air-Gapped Bundle Builder (v$APP_VERSION)${NC}"
echo -e "${CYAN}=============================================================================${NC}"

# -----------------------------------------------------------------------------
# 1. Check required tools
# -----------------------------------------------------------------------------
step "Checking required tools"

command -v python3 >/dev/null 2>&1 || fail "python3 not found in PATH."
command -v node    >/dev/null 2>&1 || fail "node not found in PATH."
command -v npm     >/dev/null 2>&1 || fail "npm not found in PATH."

PY_VER_STR=$(python3 --version 2>&1)
echo "  Python : $PY_VER_STR"
echo "  Node   : $(node --version)"
echo "  npm    : $(npm --version)"

# Extract major.minor and ABI tag from the detected Python version.
if [[ "$PY_VER_STR" =~ Python\ ([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
    PY_MAJOR="${BASH_REMATCH[1]}"
    PY_MINOR="${BASH_REMATCH[2]}"
    PY_VERSION="$PY_MAJOR.$PY_MINOR"
    PY_ABI="cp$PY_MAJOR$PY_MINOR"
else
    fail "Could not parse Python version from: $PY_VER_STR"
fi
echo "  Target  : Python $PY_VERSION / ABI $PY_ABI (auto-detected from dev machine)"

# -----------------------------------------------------------------------------
# 2. Detect platform for wheel download
# -----------------------------------------------------------------------------
step "Detecting platform"

OS=$(uname -s)
ARCH=$(uname -m)

case "$OS-$ARCH" in
    Linux-x86_64)   PLATFORM="manylinux_2_17_x86_64" ;;
    Linux-aarch64)  PLATFORM="manylinux_2_17_aarch64" ;;
    Darwin-x86_64)  PLATFORM="macosx_12_0_x86_64" ;;
    Darwin-arm64)   PLATFORM="macosx_12_0_arm64" ;;
    *) fail "Unsupported platform: $OS-$ARCH" ;;
esac

echo "  Platform : $OS $ARCH -> $PLATFORM"

# -----------------------------------------------------------------------------
# 3. Clean previous bundle
# -----------------------------------------------------------------------------
step "Cleaning previous bundle"

# --skip-wheels/--skip-models are meant to reuse what's already in this
# bundle dir, but this step used to wipe the whole dir unconditionally
# first, so there was never anything left for either flag to find. Preserve
# the relevant folder(s) across the wipe when the corresponding flag is set.
PRESERVE_TEMP="$(mktemp -d)"
PRESERVED_WHEELS=""
PRESERVED_MODELS=""

if [ "$SKIP_WHEELS" = true ] && [ -d "$WHEELS_DIR" ]; then
    PRESERVED_WHEELS="$PRESERVE_TEMP/wheels"
    mv "$WHEELS_DIR" "$PRESERVED_WHEELS"
fi
if [ "$SKIP_MODELS" = true ] && [ -d "$MODELS_DIR" ]; then
    PRESERVED_MODELS="$PRESERVE_TEMP/models"
    mv "$MODELS_DIR" "$PRESERVED_MODELS"
fi

if [ -d "$BUNDLE_DIR" ]; then
    rm -rf "$BUNDLE_DIR"
    echo "  Removed existing $(basename "$BUNDLE_DIR")/"
fi
mkdir -p "$BUNDLE_DIR"

if [ -n "$PRESERVED_WHEELS" ]; then
    mkdir -p "$(dirname "$WHEELS_DIR")"
    mv "$PRESERVED_WHEELS" "$WHEELS_DIR"
    echo "  Preserved existing wheels/ for --skip-wheels."
fi
if [ -n "$PRESERVED_MODELS" ]; then
    mkdir -p "$(dirname "$MODELS_DIR")"
    mv "$PRESERVED_MODELS" "$MODELS_DIR"
    echo "  Preserved existing backend/data/models/ for --skip-models."
fi
rm -rf "$PRESERVE_TEMP"

# -----------------------------------------------------------------------------
# 4. Build frontend
# -----------------------------------------------------------------------------
step "Building frontend (VITE_API_URL='' for same-origin relative API calls)"

cd "$ROOT_DIR/frontend"

export VITE_API_URL=""

echo "  Running npm ci..."
npm ci --silent

echo "  Running npm run build..."
npm run build

[ -f "$ROOT_DIR/frontend/dist/index.html" ] || fail "Frontend build failed - dist/index.html not found."
echo "  Frontend build successful."

# -----------------------------------------------------------------------------
# 5. Download Python wheels
# -----------------------------------------------------------------------------
if [ "$SKIP_WHEELS" = true ]; then
    step "Skipping wheel download (--skip-wheels)"
    [ -d "$WHEELS_DIR" ] || fail "No wheels found at $WHEELS_DIR - cannot skip. Run without --skip-wheels first."
    WHEEL_COUNT=$(find "$WHEELS_DIR" -name "*.whl" | wc -l | tr -d ' ')
    echo "  Reusing $WHEEL_COUNT existing wheel(s)."
else
    step "Downloading Python wheels (platform: $PLATFORM, python: $PY_VERSION)"
    mkdir -p "$WHEELS_DIR"

    python3 -m pip download \
        --dest "$WHEELS_DIR" \
        --only-binary :all: \
        --platform "$PLATFORM" \
        --python-version "$PY_VERSION" \
        --abi "$PY_ABI" \
        -r "$ROOT_DIR/backend/requirements.txt"

    WHEEL_COUNT=$(find "$WHEELS_DIR" -name "*.whl" | wc -l | tr -d ' ')
    echo "  Downloaded $WHEEL_COUNT wheel(s)."
fi

# -----------------------------------------------------------------------------
# 6. Pre-download PaddleOCR models
# -----------------------------------------------------------------------------

if [ "$SKIP_MODELS" = true ]; then
    step "Skipping PaddleOCR model download (--skip-models)"
    { [ -d "$MODELS_DIR/det" ] && [ -d "$MODELS_DIR/rec" ]; } || \
        fail "No models found at $MODELS_DIR - cannot skip. Run without --skip-models first."
    DET_FILES=$(find "$MODELS_DIR/det" -type f | wc -l | tr -d ' ')
    REC_FILES=$(find "$MODELS_DIR/rec" -type f | wc -l | tr -d ' ')
    echo "  Reusing existing models: det ($DET_FILES files), rec ($REC_FILES files)."
else
    step "Pre-downloading PaddleOCR models (det + rec, lang=en)"
    mkdir -p "$MODELS_DIR/det" "$MODELS_DIR/rec"

    echo "  Initialising PaddleOCR - this may take a few minutes on first run..."

    TEMP_SCRIPT=$(mktemp /tmp/paddle_download_XXXXXX.py)
    # PaddleOCR 3.x (PaddleX) always downloads models to ~/.paddlex/official_models/
    # when no custom dir is given. Passing an empty directory raises FileNotFoundError
    # because PaddleX requires inference.yml to already exist in any custom dir.
    # Strategy: init without custom dirs (triggers download to PaddleX cache), then
    # copy from the cache paths reported by the pipeline into the bundle dirs.
    cat > "$TEMP_SCRIPT" << 'PYEOF'
import os, sys, shutil
from pathlib import Path
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"
from paddleocr import PaddleOCR

models_dir = Path(sys.argv[1])

# Init without custom dirs so PaddleX downloads to its default cache.
ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    lang="en",
)

# Locate where PaddleX stored the models via the pipeline object.
try:
    pipeline = ocr.paddlex_pipeline
    det_src = Path(pipeline._pipeline.text_det_model.model_dir)
    rec_src = Path(pipeline._pipeline.text_rec_model.model_dir)
except AttributeError:
    # Fallback: scan ~/.paddlex/official_models/ for det/rec dirs.
    cache = Path.home() / ".paddlex" / "official_models"
    candidates = [m for m in cache.iterdir() if (m / "inference.yml").exists()]
    det_candidates = [m for m in candidates if "det" in m.name.lower()]
    rec_candidates = [m for m in candidates if "rec" in m.name.lower()]
    if not det_candidates or not rec_candidates:
        print(f"ERROR: Could not locate models in {cache}", file=sys.stderr)
        sys.exit(1)
    det_src = det_candidates[0]
    rec_src = rec_candidates[0]

print(f"  Detection model source : {det_src}")
print(f"  Recognition model source: {rec_src}")

shutil.copytree(str(det_src), str(models_dir / "det"), dirs_exist_ok=True)
shutil.copytree(str(rec_src), str(models_dir / "rec"), dirs_exist_ok=True)
print("PaddleOCR models ready.")
PYEOF

    python3 "$TEMP_SCRIPT" "$MODELS_DIR"
    rm -f "$TEMP_SCRIPT"

    DET_FILES=$(find "$MODELS_DIR/det" -type f | wc -l | tr -d ' ')
    REC_FILES=$(find "$MODELS_DIR/rec" -type f | wc -l | tr -d ' ')

    if [ "$DET_FILES" -eq 0 ] || [ "$REC_FILES" -eq 0 ]; then
        fail "PaddleOCR model download appears incomplete (det=$DET_FILES files, rec=$REC_FILES files)."
    fi
    echo "  Models downloaded: det ($DET_FILES files), rec ($REC_FILES files)."
fi

# -----------------------------------------------------------------------------
# 7. Assemble bundle
# -----------------------------------------------------------------------------
step "Assembling bundle"

mkdir -p "$BUNDLE_DIR/backend"
cp -r "$ROOT_DIR/backend/app"              "$BUNDLE_DIR/backend/app"
cp    "$ROOT_DIR/backend/requirements.txt" "$BUNDLE_DIR/backend/requirements.txt"
cp    "$ROOT_DIR/backend/.env.example"     "$BUNDLE_DIR/backend/.env.example"

mkdir -p "$BUNDLE_DIR/backend/data/templates"
cp -r "$ROOT_DIR/backend/data/templates/." "$BUNDLE_DIR/backend/data/templates/"

cp -r "$ROOT_DIR/frontend/dist" "$BUNDLE_DIR/backend/static"

cp "$ROOT_DIR/scripts/install.sh"          "$BUNDLE_DIR/install.sh"
cp "$ROOT_DIR/scripts/start.sh"            "$BUNDLE_DIR/start.sh"
cp "$ROOT_DIR/scripts/uninstall.sh"        "$BUNDLE_DIR/uninstall.sh"
cp "$ROOT_DIR/scripts/setup_credentials.py" "$BUNDLE_DIR/setup_credentials.py"
chmod +x "$BUNDLE_DIR/install.sh" "$BUNDLE_DIR/start.sh" "$BUNDLE_DIR/uninstall.sh"

# VERSION at the bundle root, mirroring the project root in dev - main.py
# reads it via a path relative to its own location (backend/app -> backend
# -> root), so this keeps that resolving correctly once bundled too.
cp "$ROOT_DIR/VERSION"                     "$BUNDLE_DIR/VERSION"

# Plain-language instructions for whoever runs this on the target machine -
# not assumed to be technical, so this is deliberately just "run this, then
# run that," nothing else.
cat > "$BUNDLE_DIR/README.txt" << EOF
NHGEI HVF Extractor - v$APP_VERSION
=============================

FIRST TIME SETUP

1. Run:  ./install.sh
   Create a username and password when asked. Remember these, you need
   them to log in.

2. Run:  ./start.sh
   Your browser opens automatically. If not, go to http://127.0.0.1:8000

After that, just run ./start.sh each time you want to use it.


STARTING OVER WITH A FRESH COPY
(for example, if this folder was copied from another computer)

1. Run ./uninstall.sh, type YES, press Enter.
2. Run ./install.sh, then ./start.sh.
EOF

echo "  Bundle layout:"
echo "    $(basename "$BUNDLE_DIR")/"
echo "      install.sh"
echo "      start.sh"
echo "      uninstall.sh"
echo "      README.txt"
echo "      setup_credentials.py"
echo "      VERSION"
echo "      wheels/              ($WHEEL_COUNT wheels)"
echo "      backend/"
echo "        app/"
echo "        data/"
echo "          templates/"
echo "          models/det/      (PaddleOCR detection model)"
echo "          models/rec/      (PaddleOCR recognition model)"
echo "        static/            (frontend build)"
echo "        requirements.txt"
echo "        .env.example"

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=============================================================================${NC}"
echo -e "${GREEN}  Bundle ready at: $BUNDLE_DIR${NC}"
echo -e "${GREEN}=============================================================================${NC}"
echo ""
echo "  Next steps:"
echo "    1. Archive and transfer:  tar -czf hvf-bundle-$APP_VERSION.tar.gz -C dist $BUNDLE_NAME/"
echo "    2. On target machine:     tar -xzf hvf-bundle-$APP_VERSION.tar.gz && cd $BUNDLE_NAME"
echo "    3. Install:               ./install.sh"
echo "    4. Start:                 ./start.sh"
echo ""
