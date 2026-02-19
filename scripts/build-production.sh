#!/bin/bash
# NavoditaERP - Production Build
# Builds frontend and prepares for single-server production deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  NavoditaERP - Production Build"
echo "=========================================="
echo ""

# Build frontend
echo "[1/3] Building frontend..."
cd "$PROJECT_DIR/frontend"
npm run build
echo "  Frontend built to frontend/dist/"

echo ""

# Run latest migrations
echo "[2/3] Running database migrations..."
cd "$PROJECT_DIR/backend"
NODE_ENV=production npx knex migrate:latest
echo "  Migrations complete"

echo ""

# Verify build
echo "[3/3] Verifying build..."
DIST_DIR="$PROJECT_DIR/frontend/dist"
if [ -f "$DIST_DIR/index.html" ]; then
  FILE_COUNT=$(find "$DIST_DIR" -type f | wc -l | tr -d ' ')
  DIST_SIZE=$(du -sh "$DIST_DIR" | cut -f1)
  echo "  Build successful: $FILE_COUNT files, $DIST_SIZE total"
else
  echo "  ERROR: Build failed - index.html not found"
  exit 1
fi

echo ""
echo "=========================================="
echo "  Production Build Complete!"
echo "=========================================="
echo ""
echo "  Start production server:"
echo "    NODE_ENV=production node backend/src/index.js"
echo ""
echo "  Or use the start script:"
echo "    ./scripts/start-production.sh"
echo ""
echo "  App will be available at: http://localhost:5001"
echo ""
