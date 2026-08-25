#!/usr/bin/env bash
# =============================================================================
# uninstall.sh - Reset the HVF Extractor to a fresh, un-installed state
# Usage: ./uninstall.sh  (run from inside the unzipped dist/hvf-extractor-v<version>/ folder)
#
# Removes all application state (admin credentials, database, uploaded
# files, logs), so install.sh can be re-run for a completely fresh install.
# Does NOT remove the virtual environment or application source - no need
# to re-copy the bundle afterward.
#
# Useful if this folder was copied from a machine where it was already
# installed/started (e.g. a staging environment) - re-running install.sh
# alone does NOT reset the admin password, because the database only seeds
# an admin user once. Uninstalling first guarantees a truly fresh install.
# =============================================================================

set -euo pipefail

BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BUNDLE_DIR/backend"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

step() { echo -e "\n${GREEN}==> $1${NC}"; }

echo ""
echo -e "${CYAN}=============================================================================${NC}"
echo -e "${CYAN}  NHGEI HVF Extractor - Uninstall${NC}"
echo -e "${CYAN}=============================================================================${NC}"
echo ""
echo "  This will permanently delete:"
echo "    - Admin credentials (backend/.env)"
echo "    - The database (backend/data/database.json) - all extraction history"
echo "    - Uploaded files (backend/data/uploads/)"
echo "    - Log files (backend/data/logs/)"
echo ""
echo "  The virtual environment and application code are NOT removed."
echo "  Run install.sh afterward for a fresh install without re-copying anything."
echo ""
echo "  Make sure the app is stopped first (Ctrl+C in the start.sh terminal) -"
echo "  some files below may be in use otherwise."
echo ""

read -r -p "  Type YES to continue: " confirm
if [ "$confirm" != "YES" ]; then
    echo ""
    echo "  Cancelled. Nothing was changed."
    exit 0
fi

step "Removing application state"

if [ -f "$BACKEND_DIR/.env" ]; then
    rm -f "$BACKEND_DIR/.env"
    echo "  Removed: $BACKEND_DIR/.env"
else
    echo "  Not present: $BACKEND_DIR/.env"
fi

if [ -f "$BACKEND_DIR/data/database.json" ]; then
    rm -f "$BACKEND_DIR/data/database.json"
    echo "  Removed: $BACKEND_DIR/data/database.json"
else
    echo "  Not present: $BACKEND_DIR/data/database.json"
fi

if [ -d "$BACKEND_DIR/data/uploads" ]; then
    find "$BACKEND_DIR/data/uploads" -type f -delete
    echo "  Cleared: $BACKEND_DIR/data/uploads/"
fi

if [ -d "$BACKEND_DIR/data/logs" ]; then
    find "$BACKEND_DIR/data/logs" -type f -delete
    echo "  Cleared: $BACKEND_DIR/data/logs/"
fi

echo ""
echo -e "${GREEN}=============================================================================${NC}"
echo -e "${GREEN}  Uninstall complete.${NC}"
echo -e "${GREEN}=============================================================================${NC}"
echo ""
echo "  Run install.sh to set up a fresh install."
echo ""
