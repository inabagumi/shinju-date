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

cd "$PROJECT_ROOT"

# Check if Supabase local stack is running via Supabase CLI
if pnpm exec supabase status 2>/dev/null | grep -q "API URL:"; then
    echo -e "${GREEN}Using Supabase CLI local instance${NC}"
    pnpm exec supabase gen types typescript --local --schema public > "$OUTPUT_FILE"
    echo -e "${GREEN}Types generated successfully at: ${OUTPUT_FILE}${NC}"
else
    echo -e "${RED}Error: Supabase local stack is not running${NC}"
    echo -e "${YELLOW}Please start Supabase first: pnpm exec supabase start${NC}"
    exit 1
fi
