#!/bin/bash
set -e

# This script is run when the database container is initialized
# It applies all migrations in order

echo "Applying database migrations..."

# Apply migrations in order
for migration in /docker-entrypoint-initdb.d/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Applying migration: $(basename "$migration")"
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < "$migration"
    fi
done

# Apply seed data if exists
if [ -f /docker-entrypoint-initdb.d/seed.sql ]; then
    echo "Applying seed data..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < /docker-entrypoint-initdb.d/seed.sql
fi

echo "Database initialization complete!"
