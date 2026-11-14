-- History of video backfill jobs (#6751)
--
-- Backfill jobs are queued in Redis with a TTL (see packages/video-backfill),
-- so what they did is gone a week after they finish. The batch app records
-- every job that finishes here instead, so that past backfills can be looked
-- up from the admin app and the accounts whose latest job failed can be
-- requested again in bulk.
--
--   1. video_backfill_job_status enum
--   2. video_backfill_jobs table (one row per finished job)
--   3. video_backfill_latest_jobs view (latest finished job of each account)
--   4. RLS: admins read, only the service role (batch) writes

-- ---------------------------------------------------------------------------
-- 1. video_backfill_job_status
--    Only finished jobs are recorded: queued and running jobs live in Redis.
-- ---------------------------------------------------------------------------
CREATE TYPE "public"."video_backfill_job_status" AS ENUM (
    'done',
    'failed'
);

ALTER TYPE "public"."video_backfill_job_status" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 2. video_backfill_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."video_backfill_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "platform" "public"."platform_type" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "talent_id" "uuid" NOT NULL,
    "run_id" "uuid",
    "requested_by" "uuid",
    "status" "public"."video_backfill_job_status" NOT NULL,
    "added" integer DEFAULT 0 NOT NULL,
    "pages" integer DEFAULT 0 NOT NULL,
    "error" "text",
    "requested_at" timestamp with time zone NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone NOT NULL,
    CONSTRAINT "video_backfill_jobs_pkey" PRIMARY KEY ("id"),
    -- A request finishes once, so recording it again (e.g. when the response
    -- to the first insert was lost) is a no-op.
    CONSTRAINT "video_backfill_jobs_request_key" UNIQUE ("platform", "account_id", "requested_at"),
    CONSTRAINT "video_backfill_jobs_counts_check" CHECK ("added" >= 0 AND "pages" >= 0),
    CONSTRAINT "video_backfill_jobs_talent_id_fkey"
        FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."video_backfill_jobs" OWNER TO "postgres";

COMMENT ON TABLE "public"."video_backfill_jobs" IS
    'Backfill jobs (reading the whole history of one platform account and saving the videos that were missing) that finished, recorded by the batch app.';

COMMENT ON COLUMN "public"."video_backfill_jobs"."account_id" IS
    'Primary key of the account row: youtube_channels.id when platform is youtube, twitch_users.id when it is twitch. Not a foreign key, so the history outlives the account.';

COMMENT ON COLUMN "public"."video_backfill_jobs"."run_id" IS
    'ID of the check of all active talents the job belonged to, if any.';

COMMENT ON COLUMN "public"."video_backfill_jobs"."requested_by" IS
    'ID of the admin user (auth.users.id) who requested the job. Not a foreign key, like audit_logs.user_id.';

COMMENT ON COLUMN "public"."video_backfill_jobs"."added" IS
    'Videos the job saved. A job that resumed after failing counts the videos saved before it resumed as well.';

COMMENT ON COLUMN "public"."video_backfill_jobs"."error" IS
    'Why the job failed, when it did.';

COMMENT ON COLUMN "public"."video_backfill_jobs"."requested_at" IS
    'When the job was requested (or requested again to resume).';

CREATE INDEX IF NOT EXISTS "video_backfill_jobs_finished_at_idx"
    ON "public"."video_backfill_jobs" USING "btree" ("finished_at" DESC);

CREATE INDEX IF NOT EXISTS "video_backfill_jobs_account_finished_at_idx"
    ON "public"."video_backfill_jobs" USING "btree" ("platform", "account_id", "finished_at" DESC);

CREATE INDEX IF NOT EXISTS "video_backfill_jobs_talent_id_idx"
    ON "public"."video_backfill_jobs" USING "btree" ("talent_id");

-- ---------------------------------------------------------------------------
-- 3. video_backfill_latest_jobs
--    The latest finished job of each account that still exists, of talents
--    that are not deleted. An account whose latest job failed has a failure
--    nobody resolved yet.
--    security_invoker: read with the permissions (and RLS) of the caller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW "public"."video_backfill_latest_jobs"
WITH ("security_invoker" = true) AS
SELECT DISTINCT ON ("j"."platform", "j"."account_id")
    "j"."id",
    "j"."created_at",
    "j"."platform",
    "j"."account_id",
    "j"."talent_id",
    "j"."run_id",
    "j"."requested_by",
    "j"."status",
    "j"."added",
    "j"."pages",
    "j"."error",
    "j"."requested_at",
    "j"."started_at",
    "j"."finished_at"
FROM "public"."video_backfill_jobs" AS "j"
JOIN "public"."talents" AS "t" ON "t"."id" = "j"."talent_id"
WHERE "t"."deleted_at" IS NULL
  AND (
    ("j"."platform" = 'youtube' AND EXISTS (
        SELECT 1 FROM "public"."youtube_channels" AS "c" WHERE "c"."id" = "j"."account_id"
    ))
    OR ("j"."platform" = 'twitch' AND EXISTS (
        SELECT 1 FROM "public"."twitch_users" AS "u" WHERE "u"."id" = "j"."account_id"
    ))
  )
ORDER BY "j"."platform", "j"."account_id", "j"."finished_at" DESC, "j"."requested_at" DESC;

ALTER VIEW "public"."video_backfill_latest_jobs" OWNER TO "postgres";

COMMENT ON VIEW "public"."video_backfill_latest_jobs" IS
    'Latest finished backfill job of each account that still exists, of talents that are not deleted.';

-- ---------------------------------------------------------------------------
-- 4. RLS
--    Only the service role (batch) records jobs; admins read the history.
--    The public has no access.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."video_backfill_jobs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated"
    ON "public"."video_backfill_jobs"
    FOR SELECT
    TO "authenticated"
    USING (true);

REVOKE ALL ON TABLE "public"."video_backfill_jobs" FROM "anon";
REVOKE ALL ON TABLE "public"."video_backfill_jobs" FROM "authenticated";
GRANT SELECT ON TABLE "public"."video_backfill_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."video_backfill_jobs" TO "service_role";

REVOKE ALL ON TABLE "public"."video_backfill_latest_jobs" FROM "anon";
REVOKE ALL ON TABLE "public"."video_backfill_latest_jobs" FROM "authenticated";
GRANT SELECT ON TABLE "public"."video_backfill_latest_jobs" TO "authenticated";
GRANT SELECT ON TABLE "public"."video_backfill_latest_jobs" TO "service_role";
