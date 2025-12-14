#!/usr/bin/env bash
set -euo pipefail

sudo npm uninstall -g pnpm
sudo corepack enable

COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version

# Install uv for Python development
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install workspace dependencies
pnpm install --frozen-lockfile

# Apply migrations and seed via Supabase CLI
echo "Resetting database using Supabase CLI (migrations + seed) ..."
# Use explicit DB URL since `supabase start` is not used in Dev Container.
# Customize via env: SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME, SUPABASE_DB_USER, SUPABASE_DB_PASS
SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-db}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
# Match Compose's DB superuser (supabase_admin) and default password
# See compose.yml: POSTGRES_USER=supabase_admin, POSTGRES_PASSWORD=postgres
SUPABASE_DB_USER="${SUPABASE_DB_USER:-supabase_admin}"
SUPABASE_DB_PASS="${SUPABASE_DB_PASS:-postgres}"
DB_URL="postgresql://${SUPABASE_DB_USER}:${SUPABASE_DB_PASS}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}?sslmode=disable"

# Try Supabase CLI first, fall back to psql-based migration import if it fails
if ! pnpm exec supabase db reset --db-url "$DB_URL" --yes; then
    echo "Supabase CLI reset failed, falling back to psql-based migration import..."
    export SUPABASE_DB_HOST SUPABASE_DB_PORT SUPABASE_DB_NAME SUPABASE_DB_USER SUPABASE_DB_PASS
    ./scripts/apply-migrations.sh || echo "Warning: Migration import failed"
fi

# Generate type definitions
pnpm typegen || true
