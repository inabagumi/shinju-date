#!/usr/bin/env bash
# Test script to verify Dev Container Dockerfile builds successfully
# This script is for development/testing purposes only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building Dev Container Dockerfile..."
docker build --no-cache -t shinju-date-devcontainer:test -f Dockerfile .

echo ""
echo "Testing installed tools..."
echo "1. PostgreSQL client (psql):"
docker run --rm shinju-date-devcontainer:test psql --version

echo ""
echo "2. Corepack:"
docker run --rm shinju-date-devcontainer:test corepack --version

echo ""
echo "3. uv (best-effort, may not be installed in all environments):"
docker run --rm shinju-date-devcontainer:test bash -c "uv --version || echo 'uv not installed (expected in network-restricted environments)'"

echo ""
echo "Cleaning up test image..."
docker rmi shinju-date-devcontainer:test

echo ""
echo "✅ All tests passed!"
