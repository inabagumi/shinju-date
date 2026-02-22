#!/bin/bash
set -euo pipefail

# Data import script for local development
# This script downloads and imports production data into the local Supabase instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${DATA_DIR:-$PROJECT_ROOT/supabase/data-exports}"
TEMP_DIR="/tmp/supabase-import"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting database import...${NC}"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Function to download from GCS
download_from_gcs() {
    local bucket=$1
    local filename=$2
    
    echo -e "${YELLOW}Downloading from GCS bucket: ${bucket}${NC}"
    
    if ! command -v gsutil &> /dev/null; then
        echo -e "${RED}Error: gsutil is not installed. Please install Google Cloud SDK.${NC}"
        exit 1
    fi
    
    # Get the latest backup file
    if [ -z "$filename" ]; then
        filename=$(gsutil ls "gs://${bucket}/database-backups/" | sort -r | head -n1 | xargs basename)
    fi
    
    gsutil cp "gs://${bucket}/database-backups/${filename}" "$TEMP_DIR/"
    echo "$TEMP_DIR/$filename"
}

# Function to download from S3
download_from_s3() {
    local bucket=$1
    local filename=$2
    
    echo -e "${YELLOW}Downloading from S3 bucket: ${bucket}${NC}"
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: aws CLI is not installed. Please install AWS CLI.${NC}"
        exit 1
    fi
    
    # Get the latest backup file
    if [ -z "$filename" ]; then
        filename=$(aws s3 ls "s3://${bucket}/database-backups/" | sort -r | head -n1 | awk '{print $4}')
    fi
    
    aws s3 cp "s3://${bucket}/database-backups/${filename}" "$TEMP_DIR/"
    echo "$TEMP_DIR/$filename"
}

# Function to get local file
get_local_file() {
    local filename=$1
    
    if [ -z "$filename" ]; then
        # Get the latest file from data exports directory
        filename=$(ls -t "$DATA_DIR"/*.sql.gz 2>/dev/null | head -n1 || echo "")
        
        if [ -z "$filename" ]; then
            echo -e "${RED}Error: No data files found in ${DATA_DIR}${NC}"
            exit 1
        fi
    else
        filename="${DATA_DIR}/${filename}"
    fi
    
    echo "$filename"
}

# Determine source of data
DATA_FILE=""
if [ -n "${GCS_BUCKET:-}" ]; then
    DATA_FILE=$(download_from_gcs "$GCS_BUCKET" "${IMPORT_FILENAME:-}")
elif [ -n "${S3_BUCKET:-}" ]; then
    DATA_FILE=$(download_from_s3 "$S3_BUCKET" "${IMPORT_FILENAME:-}")
else
    echo -e "${YELLOW}No cloud storage configured, using local files${NC}"
    DATA_FILE=$(get_local_file "${IMPORT_FILENAME:-}")
fi

echo -e "${YELLOW}Using data file: ${DATA_FILE}${NC}"

# Check if file exists
if [ ! -f "$DATA_FILE" ]; then
    echo -e "${RED}Error: Data file not found: ${DATA_FILE}${NC}"
    exit 1
fi

# Decompress if needed
if [[ "$DATA_FILE" == *.gz ]]; then
    echo -e "${YELLOW}Decompressing file...${NC}"
    DECOMPRESSED_FILE="${TEMP_DIR}/import_data.sql"
    gunzip -c "$DATA_FILE" > "$DECOMPRESSED_FILE"
    DATA_FILE="$DECOMPRESSED_FILE"
fi

# Check if Supabase local stack is running via Supabase CLI
cd "$PROJECT_ROOT"
echo -e "${YELLOW}Checking Supabase status...${NC}"

# Allow callers to override DB URL (e.g. from Dev Container where localhost != host)
if [ -n "${SUPABASE_DB_URL:-}" ]; then
    DB_URL="$SUPABASE_DB_URL"
    echo -e "${GREEN}Using SUPABASE_DB_URL override${NC}"
else
    # Capture supabase status output once to avoid duplicate invocations and
    # to prevent set -euo pipefail from exiting early if the command fails.
    SUPABASE_STATUS_OUTPUT=$(pnpm exec supabase status 2>/dev/null || true)

    if echo "$SUPABASE_STATUS_OUTPUT" | grep -q "DB URL:"; then
        echo -e "${GREEN}Supabase is running via CLI${NC}"
        DB_URL=$(echo "$SUPABASE_STATUS_OUTPUT" | grep "DB URL:" | awk '{print $NF}')
    fi

    if [ -z "${DB_URL:-}" ]; then
        echo -e "${RED}Error: Supabase local stack is not running${NC}"
        echo -e "${YELLOW}Please start Supabase first: pnpm exec supabase start${NC}"
        echo -e "${YELLOW}Or set SUPABASE_DB_URL to connect directly.${NC}"
        exit 1
    fi

    # Inside a Dev Container the Supabase ports are published on the Docker host,
    # not on localhost inside the container. Replace the host portion so psql can
    # reach the database.
    if [ "${RUNNING_IN_DEVCONTAINER:-}" = "true" ] || [ -n "${REMOTE_CONTAINERS:-}" ] || [ -n "${CODESPACES:-}" ]; then
        DB_URL="${DB_URL/localhost/host.docker.internal}"
        DB_URL="${DB_URL/127.0.0.1/host.docker.internal}"
    fi
fi

echo -e "${YELLOW}Importing data into local database...${NC}"

# Import the data using psql with the resolved URL
psql "$DB_URL" < "$DATA_FILE"

echo -e "${GREEN}Data import completed successfully!${NC}"

# Cleanup temp directory
rm -rf "$TEMP_DIR"

echo -e "${GREEN}Done!${NC}"
echo -e "${YELLOW}You can now access Supabase Studio at: http://localhost:54323${NC}"
