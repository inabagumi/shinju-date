#!/bin/bash
set -euo pipefail

# Data export script for production database
# This script exports non-sensitive data from the production database to be used in local development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_ROOT/supabase/data-exports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${OUTPUT_DIR}/production_data_${TIMESTAMP}.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting database export...${NC}"

# Check required environment variables
if [ -z "${SUPABASE_PROJECT_ID:-}" ]; then
    echo -e "${RED}Error: SUPABASE_PROJECT_ID environment variable is not set${NC}"
    exit 1
fi

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
    echo -e "${RED}Error: SUPABASE_DB_PASSWORD environment variable is not set${NC}"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}Exporting data from project: ${SUPABASE_PROJECT_ID}${NC}"
echo -e "${YELLOW}Output file: ${OUTPUT_FILE}${NC}"

# Connection details
DB_HOST="db.${SUPABASE_PROJECT_ID}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# Tables to export (customize this list based on your needs)
# Exclude tables with sensitive personal information
TABLES_TO_EXPORT=(
    # Add your table names here, for example:
    # "public.videos"
    # "public.channels"
    # "public.tags"
)

# If no specific tables are defined, export all tables from public schema
if [ ${#TABLES_TO_EXPORT[@]} -eq 0 ]; then
    echo -e "${YELLOW}No specific tables defined, exporting all tables from public schema${NC}"
    
    # Export all tables using pg_dump
    PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --schema=public \
        --data-only \
        --no-owner \
        --no-privileges \
        --file="$OUTPUT_FILE"
else
    echo -e "${YELLOW}Exporting specified tables: ${TABLES_TO_EXPORT[*]}${NC}"
    
    # Export specific tables
    TABLES_ARG=""
    for table in "${TABLES_TO_EXPORT[@]}"; do
        TABLES_ARG="$TABLES_ARG --table=$table"
    done
    
    PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --data-only \
        --no-owner \
        --no-privileges \
        $TABLES_ARG \
        --file="$OUTPUT_FILE"
fi

# Compress the output file
echo -e "${YELLOW}Compressing export file...${NC}"
gzip "$OUTPUT_FILE"
COMPRESSED_FILE="${OUTPUT_FILE}.gz"

echo -e "${GREEN}Export completed successfully!${NC}"
echo -e "${GREEN}Compressed file: ${COMPRESSED_FILE}${NC}"
echo -e "${GREEN}File size: $(du -h "$COMPRESSED_FILE" | cut -f1)${NC}"

# Optional: Upload to cloud storage (GCS or S3)
if [ -n "${UPLOAD_TO_CLOUD:-}" ]; then
    echo -e "${YELLOW}Uploading to cloud storage...${NC}"
    
    if [ -n "${GCS_BUCKET:-}" ]; then
        # Upload to Google Cloud Storage
        echo -e "${YELLOW}Uploading to GCS bucket: ${GCS_BUCKET}${NC}"
        gsutil cp "$COMPRESSED_FILE" "gs://${GCS_BUCKET}/database-backups/"
        echo -e "${GREEN}Uploaded to GCS successfully${NC}"
    elif [ -n "${S3_BUCKET:-}" ]; then
        # Upload to Amazon S3
        echo -e "${YELLOW}Uploading to S3 bucket: ${S3_BUCKET}${NC}"
        aws s3 cp "$COMPRESSED_FILE" "s3://${S3_BUCKET}/database-backups/"
        echo -e "${GREEN}Uploaded to S3 successfully${NC}"
    else
        echo -e "${YELLOW}No cloud storage bucket configured. Skipping upload.${NC}"
    fi
fi

echo -e "${GREEN}Done!${NC}"
