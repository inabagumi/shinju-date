-- 拡張機能とENUM型定義

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgroonga" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

ALTER SCHEMA "public" OWNER TO "postgres";
COMMENT ON SCHEMA "public" IS 'standard public schema';

-- ENUM型定義
CREATE TYPE "public"."audit_action" AS ENUM (
    'CHANNEL_CREATE',
    'CHANNEL_DELETE',
    'CHANNEL_UPDATE',
    'RECOMMENDED_QUERY_CREATE',
    'RECOMMENDED_QUERY_DELETE',
    'TERM_CREATE',
    'TERM_DELETE',
    'TERM_UPDATE',
    'VIDEO_DELETE',
    'VIDEO_VISIBILITY_TOGGLE',
    'VIDEO_UPDATE',
    'VIDEO_SYNC',
    'CHANNEL_SYNC',
    'MAINTENANCE_MODE_ENABLE',
    'MAINTENANCE_MODE_DISABLE',
    'ACCOUNT_EMAIL_UPDATE',
    'ACCOUNT_PASSWORD_UPDATE',
    'ANNOUNCEMENT_CREATE',
    'ANNOUNCEMENT_DELETE',
    'ANNOUNCEMENT_UPDATE',
    'YOUTUBE_CHANNEL_CREATE',
    'YOUTUBE_CHANNEL_DELETE',
    'VIDEO_RESTORE'
);
ALTER TYPE "public"."audit_action" OWNER TO "postgres";

CREATE TYPE "public"."platform_type" AS ENUM (
    'youtube',
    'twitch'
);
ALTER TYPE "public"."platform_type" OWNER TO "postgres";

CREATE TYPE "public"."twitch_video_type" AS ENUM (
    'vod',
    'clip',
    'highlight',
    'premiere',
    'upload'
);
ALTER TYPE "public"."twitch_video_type" OWNER TO "postgres";

CREATE TYPE "public"."video_status" AS ENUM (
    'UPCOMING',
    'LIVE',
    'ENDED',
    'PUBLISHED'
);
ALTER TYPE "public"."video_status" OWNER TO "postgres";
