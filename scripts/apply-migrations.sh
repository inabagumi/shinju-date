#!/usr/bin/env bash
# Apply Supabase migrations and seed data via psql
# This script imports all SQL files from supabase/migrations/ directory in sorted order
# and then applies the seed.sql file if it exists

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="${PROJECT_ROOT}/supabase/migrations"
SEED_FILE="${PROJECT_ROOT}/supabase/seed.sql"

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
    
    # Run migration and capture both stdout and stderr to suppress verbose output
    # but preserve it for error display if needed
    if output=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" -v ON_ERROR_STOP=1 2>&1); then
        echo -e "${GREEN}✓ Successfully applied: ${filename}${NC}"
        APPLIED=$((APPLIED + 1))
    else
        exit_code=$?
        echo -e "${RED}✗ Failed to apply: ${filename}${NC}"
        FAILED=$((FAILED + 1))
        
        # Show the captured error output
        echo -e "${RED}Error details:${NC}"
        echo "$output" >&2
        
        # Decide whether to continue or stop
        if [ "${CONTINUE_ON_ERROR:-false}" = "true" ]; then
            echo -e "${YELLOW}Continuing despite error (CONTINUE_ON_ERROR=true)${NC}"
        else
            echo -e "${RED}Stopping due to error. Set CONTINUE_ON_ERROR=true to continue despite errors.${NC}"
            exit "$exit_code"
        fi
    fi
done

echo ""
echo -e "${GREEN}Migration Summary:${NC}"
echo -e "  Applied: ${GREEN}${APPLIED}${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "  Failed:  ${RED}${FAILED}${NC}"
    echo -e "${YELLOW}Some migrations failed. Please review the errors above.${NC}"
else
    echo -e "${GREEN}All migrations applied successfully!${NC}"
fi

# Apply seed data if file exists
SEED_FAILED=0
if [ -f "$SEED_FILE" ]; then
    echo ""
    echo -e "${GREEN}Applying seed data from seed.sql...${NC}"
    
    if output=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE" -v ON_ERROR_STOP=1 2>&1); then
        echo -e "${GREEN}✓ Seed data applied successfully${NC}"
    else
        exit_code=$?
        SEED_FAILED=1
        echo -e "${RED}✗ Failed to apply seed data${NC}"
        echo -e "${RED}Error details:${NC}"
        echo "$output" >&2
        
        if [ "${CONTINUE_ON_ERROR:-false}" = "true" ]; then
            echo -e "${YELLOW}Continuing despite error (CONTINUE_ON_ERROR=true)${NC}"
        else
            echo -e "${RED}Stopping due to error. Set CONTINUE_ON_ERROR=true to continue despite errors.${NC}"
            exit "$exit_code"
        fi
    fi
else
    echo -e "${YELLOW}No seed.sql file found, skipping seed data${NC}"
fi

# Exit with failure if any step failed
if [ $FAILED -gt 0 ] || [ $SEED_FAILED -gt 0 ]; then
    exit 1
fi

exit 0
