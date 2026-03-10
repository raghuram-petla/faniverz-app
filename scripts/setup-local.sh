#!/usr/bin/env bash
set -euo pipefail

# Faniverz — Local Development Setup
# Automates: dependency install, Supabase, MinIO (local R2), env config, DB migrations.
#
# Usage:
#   bash scripts/setup-local.sh            # normal run (skips db reset if tables exist)
#   bash scripts/setup-local.sh --reset-db # force db reset (use after schema/seed changes)

FORCE_DB_RESET=false
for arg in "$@"; do
  case "$arg" in
    --reset-db) FORCE_DB_RESET=true ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
fail()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ── Prerequisites ──────────────────────────────────────────
echo ""
echo "Checking prerequisites..."

command -v node  >/dev/null 2>&1 || fail "Node.js is not installed. Install it from https://nodejs.org"
command -v yarn  >/dev/null 2>&1 || fail "Yarn is not installed. Run: npm install -g yarn"
command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Install Docker Desktop."
docker info >/dev/null 2>&1 || fail "Docker is not running. Start Docker Desktop first."
command -v supabase >/dev/null 2>&1 || fail "Supabase CLI is not installed. Run: brew install supabase/tap/supabase"

info "All prerequisites found"

# ── Dependencies ───────────────────────────────────────────
echo ""
echo "Installing dependencies..."

if [ ! -d "node_modules" ]; then
  yarn install
  info "Mobile dependencies installed"
else
  info "Mobile dependencies already installed (skipping)"
fi

if [ ! -d "admin/node_modules" ]; then
  (cd admin && yarn install)
  info "Admin dependencies installed"
else
  info "Admin dependencies already installed (skipping)"
fi

# ── Environment Files ──────────────────────────────────────
echo ""
echo "Setting up environment files..."

if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  info "Created .env.local (mobile)"
else
  warn ".env.local already exists (skipping)"
fi

if [ ! -f "admin/.env.local" ]; then
  cp admin/.env.example admin/.env.local
  info "Created admin/.env.local"
else
  warn "admin/.env.local already exists (skipping)"
fi

# ── Supabase ───────────────────────────────────────────────
echo ""
echo "Starting Supabase..."

if curl -sf http://127.0.0.1:54321/rest/v1/ -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" >/dev/null 2>&1; then
  info "Supabase is already running"
else
  supabase start
  info "Supabase started"
fi

# Capture Supabase keys
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_ANON_KEY=$(supabase status --output json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['ANON_KEY'])" 2>/dev/null || echo "")
SUPABASE_SERVICE_KEY=$(supabase status --output json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])" 2>/dev/null || echo "")

if [ -n "$SUPABASE_ANON_KEY" ]; then
  # Update mobile .env.local — use LAN IP so the device/emulator can reach Supabase
  MOBILE_SUPABASE_URL="http://${LAN_IP}:54321"
  sed -i '' "s|^EXPO_PUBLIC_SUPABASE_URL=.*|EXPO_PUBLIC_SUPABASE_URL=${MOBILE_SUPABASE_URL}|" .env.local 2>/dev/null || true
  sed -i '' "s|^EXPO_PUBLIC_SUPABASE_ANON_KEY=.*|EXPO_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}|" .env.local 2>/dev/null || true

  # Update admin .env.local — admin runs on localhost, so 127.0.0.1 is fine
  sed -i '' "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}|" admin/.env.local 2>/dev/null || true
  sed -i '' "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}|" admin/.env.local 2>/dev/null || true
  sed -i '' "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}|" admin/.env.local 2>/dev/null || true
  info "Supabase keys injected into .env.local files"
fi

# ── MinIO (local S3/R2) ───────────────────────────────────
echo ""
echo "Starting MinIO (local R2 storage)..."

MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# Detect LAN IP so the mobile device/emulator can reach MinIO
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
if [ "$LAN_IP" = "" ]; then LAN_IP="localhost"; fi
info "Detected LAN IP: ${LAN_IP}"

MINIO_ENDPOINT="http://${LAN_IP}:${MINIO_PORT}"

BUCKETS=(
  "faniverz-actor-photos"
  "faniverz-movie-posters"
  "faniverz-movie-backdrops"
  "faniverz-production-house-logos"
  "faniverz-platform-logos"
  "faniverz-profile-avatars"
)

if docker ps --format '{{.Names}}' | grep -q '^faniverz-minio$'; then
  info "MinIO is already running"
else
  docker rm -f faniverz-minio >/dev/null 2>&1 || true
  docker run -d --name faniverz-minio \
    -p ${MINIO_PORT}:9000 -p ${MINIO_CONSOLE_PORT}:9001 \
    -e MINIO_ROOT_USER=${MINIO_ACCESS_KEY} \
    -e MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY} \
    minio/minio server /data --console-address ":9001" >/dev/null
  info "MinIO started"

  # Wait for MinIO to be ready
  echo "  Waiting for MinIO..."
  for i in $(seq 1 15); do
    if curl -sf "${MINIO_ENDPOINT}/minio/health/live" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

# Configure mc alias inside the MinIO container
docker exec faniverz-minio mc alias set local http://localhost:9000 "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null 2>&1

# Create buckets and set public read policy
for BUCKET in "${BUCKETS[@]}"; do
  docker exec faniverz-minio mc mb "local/${BUCKET}" --ignore-existing >/dev/null 2>&1 || warn "Could not create bucket ${BUCKET}"
  docker exec faniverz-minio mc anonymous set download "local/${BUCKET}" >/dev/null 2>&1 || true
done
info "Buckets created: ${BUCKETS[*]}"

# Inject MinIO config into admin/.env.local
sed -i '' "s|^R2_ENDPOINT=.*|R2_ENDPOINT=${MINIO_ENDPOINT}|" admin/.env.local 2>/dev/null || true
sed -i '' "s|^R2_ACCESS_KEY_ID=.*|R2_ACCESS_KEY_ID=${MINIO_ACCESS_KEY}|" admin/.env.local 2>/dev/null || true
sed -i '' "s|^R2_SECRET_ACCESS_KEY=.*|R2_SECRET_ACCESS_KEY=${MINIO_SECRET_KEY}|" admin/.env.local 2>/dev/null || true
sed -i '' "s|^R2_PUBLIC_BASE_URL_ACTORS=.*|R2_PUBLIC_BASE_URL_ACTORS=${MINIO_ENDPOINT}/faniverz-actor-photos|" admin/.env.local 2>/dev/null || true
sed -i '' "s|^R2_PUBLIC_BASE_URL_POSTERS=.*|R2_PUBLIC_BASE_URL_POSTERS=${MINIO_ENDPOINT}/faniverz-movie-posters|" admin/.env.local 2>/dev/null || true
sed -i '' "s|^R2_PUBLIC_BASE_URL_BACKDROPS=.*|R2_PUBLIC_BASE_URL_BACKDROPS=${MINIO_ENDPOINT}/faniverz-movie-backdrops|" admin/.env.local 2>/dev/null || true
sed -i '' "s|^R2_PUBLIC_BASE_URL_AVATARS=.*|R2_PUBLIC_BASE_URL_AVATARS=${MINIO_ENDPOINT}/faniverz-profile-avatars|" admin/.env.local 2>/dev/null || true
sed -i '' "s|^R2_PUBLIC_BASE_URL_PLATFORMS=.*|R2_PUBLIC_BASE_URL_PLATFORMS=${MINIO_ENDPOINT}/faniverz-platform-logos|" admin/.env.local 2>/dev/null || true
sed -i '' "s|^R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES=.*|R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES=${MINIO_ENDPOINT}/faniverz-production-house-logos|" admin/.env.local 2>/dev/null || true
info "MinIO credentials injected into admin/.env.local"

# ── Database Migrations ────────────────────────────────────
echo ""
echo "Applying database migrations..."

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
TABLE_COUNT=$(psql "$DB_URL" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")

if [ "$FORCE_DB_RESET" = true ]; then
  supabase db reset
  info "Database reset (forced via --reset-db)"
elif [ "$TABLE_COUNT" -le 1 ]; then
  supabase db reset
  info "Database migrations + seed applied (fresh database)"
else
  info "Database already has tables (skipping reset — use --reset-db to force)"
fi

# ── Image Variant Backfill ─────────────────────────────────
echo ""
echo "Backfilling image variants (TMDB → MinIO with _sm/_md/_lg)..."

set -a
source admin/.env.local
set +a

SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
R2_ENDPOINT="$R2_ENDPOINT" \
R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
R2_PUBLIC_BASE_URL_POSTERS="$R2_PUBLIC_BASE_URL_POSTERS" \
R2_PUBLIC_BASE_URL_BACKDROPS="$R2_PUBLIC_BASE_URL_BACKDROPS" \
R2_PUBLIC_BASE_URL_ACTORS="$R2_PUBLIC_BASE_URL_ACTORS" \
R2_PUBLIC_BASE_URL_AVATARS="$R2_PUBLIC_BASE_URL_AVATARS" \
R2_PUBLIC_BASE_URL_PLATFORMS="$R2_PUBLIC_BASE_URL_PLATFORMS" \
R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES="$R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES" \
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  npx tsx scripts/backfill-image-variants.ts

info "Image variants backfilled"

# ── Shell Guard: block accidental `supabase db reset` ─────
echo ""
echo "Installing supabase db reset guard..."

GUARD_MARKER="# Guard against accidental supabase db reset"
SHELL_RC="$HOME/.zshrc"
[ -f "$HOME/.bashrc" ] && [ ! -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.bashrc"

if grep -qF "$GUARD_MARKER" "$SHELL_RC" 2>/dev/null; then
  info "Shell guard already installed in $(basename "$SHELL_RC")"
else
  cat >> "$SHELL_RC" << 'GUARD'

# Guard against accidental supabase db reset
supabase() {
  if [[ "$1" == "db" && "$2" == "reset" && "$*" != *"--force"* ]]; then
    echo "\033[31mBLOCKED: 'supabase db reset' wipes all local data.\033[0m"
    echo "If you really mean it, run: supabase db reset --force"
    return 1
  fi
  command supabase "$@"
}
GUARD
  info "Shell guard installed — 'supabase db reset' now requires --force"
fi

# ── Summary ────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Local development environment is ready!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Supabase API:     http://127.0.0.1:54321"
echo "  Supabase Studio:  http://127.0.0.1:54323"
echo "  MinIO Console:    http://localhost:9001  (minioadmin / minioadmin)"
echo "  MinIO S3 API:     http://localhost:9000"
echo ""
echo "  Start mobile app:    yarn start"
echo "  Start admin panel:   cd admin && yarn dev"
echo ""
echo "  Stop services:       supabase stop && docker stop faniverz-minio"
echo ""
