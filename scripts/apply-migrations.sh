#!/usr/bin/env bash
# Apply Supabase migrations via psql
# This script imports all SQL files from supabase/migrations/ directory in sorted order

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="${PROJECT_ROOT}/supabase/migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Applying Supabase migrations via psql...${NC}"

# Database connection parameters with defaults for Dev Container
DB_HOST="${SUPABASE_DB_HOST:-db}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-supabase_admin}"
DB_PASSWORD="${SUPABASE_DB_PASS:-postgres}"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Error: Migrations directory not found: ${MIGRATIONS_DIR}${NC}"
    exit 1
fi

# Get list of migration files sorted by name
mapfile -t MIGRATION_FILES < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort)

if [ ${#MIGRATION_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}Warning: No migration files found in ${MIGRATIONS_DIR}${NC}"
    exit 0
fi

echo -e "${YELLOW}Found ${#MIGRATION_FILES[@]} migration files${NC}"

# Apply each migration file
APPLIED=0
FAILED=0

for migration_file in "${MIGRATION_FILES[@]}"; do
    filename=$(basename "$migration_file")
    echo -e "${YELLOW}Applying migration: ${filename}${NC}"
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" -v ON_ERROR_STOP=1 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Successfully applied: ${filename}${NC}"
        APPLIED=$((APPLIED + 1))
    else
        echo -e "${RED}✗ Failed to apply: ${filename}${NC}"
        FAILED=$((FAILED + 1))
        
        # Show detailed error for debugging
        echo -e "${RED}Attempting to show error details:${NC}"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" -v ON_ERROR_STOP=1 || true
        
        # Decide whether to continue or stop
        if [ "${CONTINUE_ON_ERROR:-false}" = "true" ]; then
            echo -e "${YELLOW}Continuing despite error (CONTINUE_ON_ERROR=true)${NC}"
        else
            echo -e "${RED}Stopping due to error. Set CONTINUE_ON_ERROR=true to continue despite errors.${NC}"
            exit 1
        fi
    fi
done

echo ""
echo -e "${GREEN}Migration Summary:${NC}"
echo -e "  Applied: ${GREEN}${APPLIED}${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "  Failed:  ${RED}${FAILED}${NC}"
fi

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All migrations applied successfully!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some migrations failed. Please review the errors above.${NC}"
    exit 1
fi
