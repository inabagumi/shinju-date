-- Dev Container initialization script
-- This script runs once when the PostgreSQL container is first created

-- Grant SUPERUSER to postgres role for Supabase CLI compatibility
-- The Supabase CLI switches to 'postgres' role during reset operations
ALTER ROLE postgres WITH SUPERUSER;
