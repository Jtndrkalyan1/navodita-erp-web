#!/bin/bash
# NavoditaERP - Start Development Servers
# Starts both backend (port 5001) and frontend (port 3000)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  NavoditaERP - Development Mode"
echo "=========================================="
echo ""
echo "  Backend:  http://localhost:5001"
echo "  Frontend: http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"
npm run dev
