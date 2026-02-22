#!/usr/bin/env bash
# Project-specific initialization script for Dev Container
# OS-level setup (apt packages, corepack, uv) is handled in Dockerfile
# This script focuses on project dependencies and database initialization

set -euo pipefail

echo "Starting project-specific initialization..."

# Install workspace dependencies
echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile

# Start Supabase using the CLI
# `supabase start` pulls required Docker images and launches all Supabase services.
# It also applies pending migrations automatically on first start.
echo "Starting Supabase via CLI..."
if pnpm exec supabase start; then
    echo "Supabase started successfully."
    # Reset database to apply all migrations and seed data cleanly
    echo "Resetting database (applying migrations + seed)..."
    pnpm exec supabase db reset --yes || echo "Warning: supabase db reset failed. Database may not be fully initialized."
else
    echo "Warning: supabase start failed. Supabase services may not be available."
    echo "You can start Supabase manually by running: pnpm exec supabase start"
fi

# Generate type definitions
echo "Generating TypeScript type definitions..."
pnpm typegen || true

echo "Project initialization completed successfully!"

