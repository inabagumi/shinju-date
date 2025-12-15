#!/usr/bin/env bash
# Project-specific initialization script for Dev Container
# OS-level setup (apt packages, corepack, uv) is handled in Dockerfile
# This script focuses on project dependencies and database initialization

set -euo pipefail

echo "Starting project-specific initialization..."

# Verify corepack-managed pnpm is available
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version

# Install workspace dependencies
echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile

# Initialize database with migrations and seed data
echo "Resetting database using Supabase CLI (migrations + seed)..."
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
echo "Generating TypeScript type definitions..."
pnpm typegen || true

echo "Project initialization completed successfully!"

