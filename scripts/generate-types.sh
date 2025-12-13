#!/bin/bash
set -euo pipefail

# Generate TypeScript types from PostgreSQL schema
# This script extracts the database schema and generates TypeScript types

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="${PROJECT_ROOT}/packages/database/types/supabase.ts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Generating TypeScript types from database schema...${NC}"

DEVCONTAINER_DIR="${PROJECT_ROOT}/.devcontainer"

# Check if database is running via Docker Compose
if docker compose -f "${DEVCONTAINER_DIR}/compose.yml" ps db 2>/dev/null | grep -q "Up\|running"; then
    echo -e "${GREEN}Using Docker Compose database${NC}"
    
    # Use supabase CLI to generate types from the local Docker database
    # The CLI connects to the database through the standard port mapping
    if command -v supabase &> /dev/null; then
        cd "$PROJECT_ROOT"
        supabase gen types typescript --db-url "postgresql://supabase_admin:postgres@localhost:54322/postgres" --schema public > "$OUTPUT_FILE"
        echo -e "${GREEN}Types generated successfully at: ${OUTPUT_FILE}${NC}"
    else
        echo -e "${RED}Error: Supabase CLI not found. Installing...${NC}"
        echo -e "${YELLOW}Please install Supabase CLI: npm install -g supabase${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: Database is not running via Docker Compose${NC}"
    echo -e "${YELLOW}Please start services: cd .devcontainer && docker compose up -d${NC}"
    exit 1
fi
