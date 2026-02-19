#!/bin/bash
# NavoditaERP - Start Production Server
# Serves both API and frontend from a single Express server on port 5001

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if frontend is built
if [ ! -f "$PROJECT_DIR/frontend/dist/index.html" ]; then
  echo "Frontend not built. Run ./scripts/build-production.sh first."
  exit 1
fi

echo "=========================================="
echo "  NavoditaERP - Production Server"
echo "=========================================="
echo ""
echo "  App: http://localhost:${PORT:-5001}"
echo "  Press Ctrl+C to stop"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"
NODE_ENV=production node backend/src/index.js
