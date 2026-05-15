#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev.sh — Start the full local development environment
#
# Usage:
#   ./dev.sh            Start backend + admin frontend concurrently
#   ./dev.sh backend    Start backend only (API on :3000)
#   ./dev.sh frontend   Start admin frontend only (React on :3001)
#   ./dev.sh setup      First-time setup: install deps + create DB
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/admin-frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev]${NC} $1"; }
fail() { echo -e "${RED}[dev]${NC} $1"; exit 1; }

# ── Prerequisite checks ───────────────────────────────────────────────────────
check_prereqs() {
  command -v node  >/dev/null 2>&1 || fail "Node.js not found. Install via: brew install node"
  command -v npm   >/dev/null 2>&1 || fail "npm not found"
  command -v psql  >/dev/null 2>&1 || fail "psql not found. Install via: brew install postgresql@16"
  pg_isready -h localhost -p 5432 >/dev/null 2>&1 || fail "PostgreSQL is not running. Start it: brew services start postgresql@16"
}

# ── First-time setup ──────────────────────────────────────────────────────────
cmd_setup() {
  log "Running first-time setup..."
  check_prereqs

  # Install dependencies
  log "Installing backend dependencies..."
  cd "$BACKEND" && npm install

  log "Installing admin frontend dependencies..."
  cd "$FRONTEND" && npm install

  # Copy .env if it doesn't exist
  if [ ! -f "$BACKEND/.env" ]; then
    cp "$BACKEND/.env.example" "$BACKEND/.env"
    warn ".env created from .env.example — edit DATABASE_URL with your macOS username"
  else
    log ".env already exists, skipping"
  fi

  # Create database
  log "Creating database (if it doesn't exist)..."
  createdb concreteMixerRental 2>/dev/null && log "Database created" || log "Database already exists"

  # Run Prisma migrations
  log "Running database migrations..."
  cd "$BACKEND" && npx prisma migrate deploy

  # Generate Prisma client
  log "Generating Prisma client..."
  npx prisma generate

  # Create uploads directory structure
  mkdir -p "$BACKEND/uploads/company"
  log "Uploads directory ready"

  log ""
  log "✅ Setup complete! Run ./dev.sh to start development servers."
  log "   Backend:  http://localhost:3000"
  log "   Frontend: http://localhost:3001"
  log "   Login:    admin / admin123 (change after first login)"
}

# ── Start backend only ────────────────────────────────────────────────────────
cmd_backend() {
  check_prereqs
  log "Starting backend (http://localhost:3000)..."
  cd "$BACKEND" && npm run dev
}

# ── Start frontend only ───────────────────────────────────────────────────────
cmd_frontend() {
  log "Starting admin frontend (http://localhost:3001)..."
  cd "$FRONTEND" && npm start
}

# ── Start both concurrently ───────────────────────────────────────────────────
cmd_all() {
  check_prereqs

  # Check deps
  [ -d "$BACKEND/node_modules" ]  || { warn "Backend deps missing. Run: ./dev.sh setup"; exit 1; }
  [ -d "$FRONTEND/node_modules" ] || { warn "Frontend deps missing. Run: ./dev.sh setup"; exit 1; }

  log "Starting backend (port 3000) + admin frontend (port 3001)..."
  log "Press Ctrl+C to stop both servers."
  log ""

  cd "$ROOT"
  npx concurrently \
    --names "backend,frontend" \
    --prefix-colors "blue,green" \
    --kill-others-on-fail \
    "cd backend && npm run dev" \
    "cd admin-frontend && npm start"
}

# ── Router ────────────────────────────────────────────────────────────────────
case "${1:-all}" in
  setup)    cmd_setup   ;;
  backend)  cmd_backend ;;
  frontend) cmd_frontend ;;
  all|"")   cmd_all     ;;
  *)        echo "Usage: ./dev.sh [setup|backend|frontend|all]"; exit 1 ;;
esac
