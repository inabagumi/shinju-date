#!/bin/bash

set -e

sudo npm uninstall -g pnpm
sudo corepack enable

COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version

# Install uv for Python development
curl -LsSf https://astral.sh/uv/install.sh | sh

pnpm install

# Generate type definitions from Supabase schema
# Note: Database should be ready via docker-compose services
# Wait for database to be ready before generating types
echo "Waiting for database to be ready..."
for i in {1..30}; do
  if pg_isready -h db -p 5432 -U supabase_admin > /dev/null 2>&1; then
    echo "Database is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Warning: Database did not become ready in time. Type generation may fail."
  fi
  sleep 2
done

pnpm typegen
