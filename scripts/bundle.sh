#!/usr/bin/env bash
# =============================================================================
# bundle.sh - Build and package the app for air-gapped deployment (Unix)
# Usage: ./scripts/bundle.sh [--skip-wheels] [--skip-models]
#
#   --skip-wheels   Reuse wheels from a previous bundle run (skip download).
#   --skip-models   Reuse PaddleOCR models from a previous bundle run.
#
# Runs on the DEVELOPER machine (requires internet, Node.js, Python).
# Produces: dist-bundle/ at the project root - tar/zip and transfer to target.
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
BUNDLE_DIR="$ROOT_DIR/dist-bundle"
WHEELS_DIR="$BUNDLE_DIR/wheels"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

step() { echo -e "\n${GREEN}==> $1${NC}"; }
warn() { echo -e "${YELLOW}[warn] $1${NC}"; }
fail() { echo -e "${RED}[error] $1${NC}"; exit 1; }

echo ""
echo -e "${CYAN}=============================================================================${NC}"
echo -e "${CYAN}  NHGEI HVF Extractor - Air-Gapped Bundle Builder${NC}"
echo -e "${CYAN}=============================================================================${NC}"

# -----------------------------------------------------------------------------
# 1. Check required tools
# -----------------------------------------------------------------------------
step "Checking required tools"

command -v python3 >/dev/null 2>&1 || fail "python3 not found in PATH."
command -v node    >/dev/null 2>&1 || fail "node not found in PATH."
command -v npm     >/dev/null 2>&1 || fail "npm not found in PATH."

echo "  Python : $(python3 --version)"
echo "  Node   : $(node --version)"
echo "  npm    : $(npm --version)"

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

if [ -d "$BUNDLE_DIR" ]; then
    rm -rf "$BUNDLE_DIR"
    echo "  Removed existing dist-bundle/"
fi
mkdir -p "$BUNDLE_DIR"

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
    step "Downloading Python wheels (platform: $PLATFORM, python: 3.11)"
    mkdir -p "$WHEELS_DIR"

    python3 -m pip download \
        --dest "$WHEELS_DIR" \
        --only-binary :all: \
        --platform "$PLATFORM" \
        --python-version 3.11 \
        --abi cp311 \
        -r "$ROOT_DIR/backend/requirements.txt"

    WHEEL_COUNT=$(find "$WHEELS_DIR" -name "*.whl" | wc -l | tr -d ' ')
    echo "  Downloaded $WHEEL_COUNT wheel(s)."
fi

# -----------------------------------------------------------------------------
# 6. Pre-download PaddleOCR models
# -----------------------------------------------------------------------------
MODELS_DIR="$BUNDLE_DIR/backend/data/models"

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

cp "$ROOT_DIR/scripts/install.sh" "$BUNDLE_DIR/install.sh"
cp "$ROOT_DIR/scripts/start.sh"   "$BUNDLE_DIR/start.sh"
chmod +x "$BUNDLE_DIR/install.sh" "$BUNDLE_DIR/start.sh"

echo "  Bundle layout:"
echo "    dist-bundle/"
echo "      install.sh"
echo "      start.sh"
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
echo "    1. Archive and transfer:  tar -czf hvf-bundle.tar.gz dist-bundle/"
echo "    2. On target machine:     tar -xzf hvf-bundle.tar.gz && cd dist-bundle"
echo "    3. Install:               ./install.sh"
echo "    4. Start:                 ./start.sh"
echo ""
