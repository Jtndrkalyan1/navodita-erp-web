#!/bin/bash
# NavoditaERP - Full Setup Script
# Installs dependencies, creates database, runs migrations and seeds

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  NavoditaERP - Setup"
echo "=========================================="
echo ""

# Check prerequisites
echo "[1/6] Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "  ERROR: Node.js not found. Install with: brew install node@20"
  exit 1
fi
NODE_VER=$(node --version)
echo "  Node.js: $NODE_VER"

if ! command -v psql &> /dev/null; then
  echo "  ERROR: PostgreSQL not found. Install with: brew install postgresql@16"
  exit 1
fi
PG_VER=$(psql --version | head -1)
echo "  PostgreSQL: $PG_VER"

echo ""

# Create database if not exists
echo "[2/6] Setting up database..."
if psql -lqt | cut -d \| -f 1 | grep -qw navodita_erp; then
  echo "  Database 'navodita_erp' already exists"
else
  createdb navodita_erp
  echo "  Database 'navodita_erp' created"
fi

echo ""

# Create .env if missing
echo "[3/6] Checking environment..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
  if [ -f "$PROJECT_DIR/.env.example" ]; then
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo "  Created .env from .env.example"
  else
    cat > "$PROJECT_DIR/.env" << 'ENVEOF'
# Database
DATABASE_URL=postgresql://$(whoami)@localhost:5432/navodita_erp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=navodita_erp
DB_USER=$(whoami)
DB_PASSWORD=

# Server
PORT=5001
NODE_ENV=development

# JWT
JWT_SECRET=navodita-erp-secret-key-change-in-production-2026
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ENVEOF
    echo "  Created .env with defaults"
  fi
else
  echo "  .env already exists"
fi

echo ""

# Install dependencies
echo "[4/6] Installing dependencies..."
cd "$PROJECT_DIR"
npm install
echo "  All dependencies installed"

echo ""

# Create upload directories
echo "[5/6] Creating upload directories..."
mkdir -p "$PROJECT_DIR/backend/uploads/documents"
mkdir -p "$PROJECT_DIR/backend/uploads/photos"
mkdir -p "$PROJECT_DIR/backend/uploads/statements"
echo "  Upload directories ready"

echo ""

# Run migrations and seeds
echo "[6/6] Running database migrations and seeds..."
cd "$PROJECT_DIR/backend"
npx knex migrate:latest
echo "  Migrations complete"
npx knex seed:run
echo "  Seeds complete"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "  Start development servers:"
echo "    cd $(basename "$PROJECT_DIR") && npm run dev"
echo ""
echo "  Or start individually:"
echo "    Backend:  cd backend && npm run dev"
echo "    Frontend: cd frontend && npm run dev"
echo ""
echo "  Access the app at: http://localhost:3000"
echo "  Default login: admin / admin123"
echo ""
