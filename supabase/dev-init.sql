-- Development-only initialization: minimal auth schema and users table
-- This ensures local migrations referencing auth.users work without modifying production migrations.

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION postgres;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
ALTER TABLE auth.users OWNER TO postgres;

-- Initialize Supabase roles required by the authentication and storage services
-- These roles are used by GoTrue (auth), PostgREST (API), and other Supabase services

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    -- PostgREST 接続に使用されるため LOGIN + PASSWORD が必要
    CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'postgres';
    GRANT CONNECT ON DATABASE postgres TO authenticator;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
    GRANT CONNECT ON DATABASE postgres TO anon;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
    GRANT CONNECT ON DATABASE postgres TO authenticated;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
    GRANT CONNECT ON DATABASE postgres TO service_role;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD 'postgres';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN PASSWORD 'postgres';
  END IF;

  -- Ensure a default superuser role named "postgres" exists for tools expecting it
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres SUPERUSER CREATEDB CREATEROLE LOGIN PASSWORD 'postgres';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO authenticator, anon, authenticated, service_role, supabase_auth_admin, supabase_storage_admin;
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO authenticator, anon, authenticated, service_role, supabase_auth_admin, supabase_storage_admin;

-- Create common Supabase-managed schemas used by migrations locally
-- These are normally present in Supabase containers; ensure they exist for local Compose
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER SCHEMA extensions OWNER TO postgres;

CREATE SCHEMA IF NOT EXISTS vault;
ALTER SCHEMA vault OWNER TO postgres;

-- Development-only initialization for local Supabase services
-- This file is only used in local Docker Compose setup and is NOT sent to production.
-- It initializes schemas and test data for Realtime, Analytics, and Vector services.

-- ============================================================================
-- Create auth schema enums required by GoTrue (DEV ONLY)
-- NOTE: The auth schema is managed by Supabase in production and cannot be modified.
--       These enums are created here only for local development with Docker Compose.
-- ============================================================================

-- code_challenge_method enum (for OAuth2 PKCE support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    WHERE t.typname = 'code_challenge_method'
      AND t.typnamespace = 'auth'::regnamespace
  ) THEN
    CREATE TYPE auth.code_challenge_method AS ENUM ('plain', 'S256');
  END IF;
END $$;

-- Ensure auth.code_challenge_method is owned by supabase_auth_admin
ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

-- factor_type enum (for multi-factor authentication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    WHERE t.typname = 'factor_type'
      AND t.typnamespace = 'auth'::regnamespace
  ) THEN
    CREATE TYPE auth.factor_type AS ENUM ('totp');
  END IF;
END $$;

-- Ensure auth.factor_type is owned by supabase_auth_admin
ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

-- ============================================================================
-- Create _realtime schema for Supabase Realtime service (DEV ONLY)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS _realtime;
COMMENT ON SCHEMA _realtime IS 'Schema for Supabase Realtime service (development only)';

-- Grant permissions to relevant roles
GRANT USAGE ON SCHEMA _realtime TO supabase_admin, authenticator, anon, authenticated, service_role;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- Set owner
ALTER SCHEMA _realtime OWNER TO supabase_admin;

-- ============================================================================
-- Create _analytics schema for Supabase Analytics (Logflare) service (DEV ONLY)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS _analytics;
COMMENT ON SCHEMA _analytics IS 'Schema for Supabase Analytics (Logflare) service (development only)';

-- Grant permissions to relevant roles
GRANT USAGE ON SCHEMA _analytics TO supabase_admin, authenticator, anon, authenticated, service_role;
GRANT ALL ON SCHEMA _analytics TO supabase_admin;

-- Set owner
ALTER SCHEMA _analytics OWNER TO supabase_admin;

-- ============================================================================
-- Logflare Analytics: Initialize single-tenant user and default sources
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = '_analytics' AND table_name = 'users'
  ) THEN
    -- Insert only if no existing row matches lower(email)
    IF NOT EXISTS (
      SELECT 1 FROM _analytics.users WHERE lower(email) = lower('default@logflare.app')
    ) THEN
      INSERT INTO _analytics.users (email, provider, token, api_key, old_api_key, provider_uid, inserted_at, updated_at)
      VALUES (
        'default@logflare.app',
        'email',
        '7d0281e5-96d6-4d1e-a82a-b011ac0c81d1'::text,
        'dev_api_key',
        NULL,
        'default@logflare.app',
        NOW(),
        NOW()
      );
    END IF;
  END IF;
END $$;

-- Get the user ID for reference
DO $$
DECLARE
  uid bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = '_analytics' AND table_name = 'sources'
  ) THEN
    SELECT id INTO uid FROM _analytics.users WHERE lower(email) = lower('default@logflare.app') LIMIT 1;
    IF uid IS NOT NULL THEN
      -- Insert sources one by one with existence checks to avoid type/ordinal mismatches
      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'vector.dev' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('vector.dev', 'f2f9fd01-33c5-411e-81d0-1f4cc7364fea'::uuid, uid, NOW(), NOW());
      END IF;

      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'cloudflare.logs.prod' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('cloudflare.logs.prod', 'b00cdf6e-1c01-4955-9ef3-b01ef313bde3'::uuid, uid, NOW(), NOW());
      END IF;

      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'postgres.logs' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('postgres.logs', '49eda50b-fa99-496b-9d91-db173d7dd79f'::uuid, uid, NOW(), NOW());
      END IF;

      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'deno-relay-logs' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('deno-relay-logs', '65358de0-4214-4aed-aca0-6508c4dbd541'::uuid, uid, NOW(), NOW());
      END IF;

      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'deno-subhosting-events' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('deno-subhosting-events', 'e6509786-e68c-4cbd-8de6-3a82a177c6d4'::uuid, uid, NOW(), NOW());
      END IF;

      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'gotrue.logs.prod' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('gotrue.logs.prod', '13495a74-045a-402c-b08f-f4ec6df9ac1f'::uuid, uid, NOW(), NOW());
      END IF;

      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'lad5.logs' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('lad5.logs', '1ad7cf77-d056-4f97-95bf-604a70b1c059'::uuid, uid, NOW(), NOW());
      END IF;

      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'relay7.logs' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('relay7.logs', '48342fe4-53e5-4d9e-83c3-e95d8011c909'::uuid, uid, NOW(), NOW());
      END IF;

      IF NOT EXISTS (SELECT 1 FROM _analytics.sources WHERE name = 'test8.logs' AND user_id = uid) THEN
        INSERT INTO _analytics.sources (name, token, user_id, inserted_at, updated_at)
        VALUES ('test8.logs', 'fd0451ea-ad40-4702-b2ee-aa7a70d57d8c'::uuid, uid, NOW(), NOW());
      END IF;
    END IF;
  END IF;
END $$;
