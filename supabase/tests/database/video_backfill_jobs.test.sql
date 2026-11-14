-- Tests for the video_backfill_jobs schema (#6751). Run with `supabase test db`.
BEGIN;

SELECT plan(16);

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
SELECT has_table('public', 'video_backfill_jobs', 'video_backfill_jobs table exists');
SELECT has_view('public', 'video_backfill_latest_jobs', 'video_backfill_latest_jobs view exists');
SELECT col_not_null('public', 'video_backfill_jobs', 'finished_at', 'finished_at is required');
SELECT col_is_null('public', 'video_backfill_jobs', 'requested_by', 'requested_by is optional');
SELECT fk_ok('public', 'video_backfill_jobs', 'talent_id', 'public', 'talents', 'id');

-- ---------------------------------------------------------------------------
-- Fixtures: an active talent with a channel and a Twitch user, and a deleted
-- talent with a channel.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."talents" ("id", "name", "deleted_at")
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Active talent', NULL),
    ('e0000000-0000-0000-0000-000000000002', 'Deleted talent', NOW());

INSERT INTO "public"."youtube_channels" ("id", "talent_id", "youtube_channel_id")
VALUES
    ('e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'UCbackfill1'),
    ('e2000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'UCbackfill2');

INSERT INTO "public"."twitch_users" ("id", "talent_id", "twitch_user_id")
VALUES
    ('e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '800001');

-- The channel failed, then succeeded; the Twitch user succeeded, then failed.
-- The channel of the deleted talent and an account that no longer exists
-- failed.
INSERT INTO "public"."video_backfill_jobs"
    ("platform", "account_id", "talent_id", "status", "added", "pages", "error", "requested_at", "finished_at")
VALUES
    ('youtube', 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'failed', 3, 1, 'quota exceeded', '2026-11-01T00:00:00Z', '2026-11-01T00:10:00Z'),
    ('youtube', 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'done', 10, 4, NULL, '2026-11-02T00:00:00Z', '2026-11-02T00:10:00Z'),
    ('twitch', 'e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'done', 5, 1, NULL, '2026-11-01T00:00:00Z', '2026-11-01T00:10:00Z'),
    ('twitch', 'e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'failed', 0, 0, 'Account not found', '2026-11-02T00:00:00Z', '2026-11-02T00:10:00Z'),
    ('youtube', 'e2000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'failed', 0, 0, 'quota exceeded', '2026-11-02T00:00:00Z', '2026-11-02T00:10:00Z'),
    ('youtube', 'e2000000-0000-0000-0000-0000000000ff', 'e0000000-0000-0000-0000-000000000001', 'failed', 0, 0, 'Account not found', '2026-11-02T00:00:00Z', '2026-11-02T00:10:00Z');

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------
SELECT throws_ok(
    $$INSERT INTO "public"."video_backfill_jobs"
        ("platform", "account_id", "talent_id", "status", "requested_at", "finished_at")
      VALUES ('youtube', 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'done', '2026-11-02T00:00:00Z', '2026-11-02T00:20:00Z')$$,
    '23505',
    NULL,
    'a request is recorded once'
);

SELECT throws_ok(
    $$INSERT INTO "public"."video_backfill_jobs"
        ("platform", "account_id", "talent_id", "status", "added", "requested_at", "finished_at")
      VALUES ('youtube', 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'done', -1, '2026-11-03T00:00:00Z', '2026-11-03T00:10:00Z')$$,
    '23514',
    NULL,
    'counts cannot be negative'
);

SELECT throws_ok(
    $$INSERT INTO "public"."video_backfill_jobs"
        ("platform", "account_id", "talent_id", "status", "requested_at", "finished_at")
      VALUES ('youtube', 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'pending', '2026-11-03T00:00:00Z', '2026-11-03T00:10:00Z')$$,
    '22P02',
    NULL,
    'only finished jobs are recorded'
);

-- ---------------------------------------------------------------------------
-- Latest job of each account
-- ---------------------------------------------------------------------------
SELECT results_eq(
    $$SELECT "platform"::"text", "account_id", "status"::"text"
      FROM "public"."video_backfill_latest_jobs"
      WHERE "talent_id" IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002')
      ORDER BY "platform", "account_id"$$,
    $$VALUES
        ('twitch', 'e3000000-0000-0000-0000-000000000001'::"uuid", 'failed'),
        ('youtube', 'e2000000-0000-0000-0000-000000000001'::"uuid", 'done')$$,
    'the latest job of each existing account of talents that are not deleted'
);

-- ---------------------------------------------------------------------------
-- RLS: only admins read, nobody but the service role writes
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "anon";

SELECT throws_ok(
    $$SELECT * FROM "public"."video_backfill_jobs"$$,
    '42501',
    NULL,
    'anon cannot read the history'
);

SELECT throws_ok(
    $$SELECT * FROM "public"."video_backfill_latest_jobs"$$,
    '42501',
    NULL,
    'anon cannot read the latest jobs'
);

RESET ROLE;

-- Admins are signed-in users with the admin role (#6473).
INSERT INTO "auth"."users" ("id", "email", "raw_app_meta_data")
VALUES ('e9000000-0000-0000-0000-000000000001', 'admin@example.test', '{"provider": "email", "role": "admin"}');

SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "e9000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);

SELECT is(
    (SELECT count(*)::integer FROM "public"."video_backfill_jobs" WHERE "talent_id" IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002')),
    6,
    'admins read the whole history'
);

SELECT is(
    (SELECT count(*)::integer FROM "public"."video_backfill_latest_jobs" WHERE "talent_id" = 'e0000000-0000-0000-0000-000000000001'),
    2,
    'admins read the latest jobs'
);

SELECT throws_ok(
    $$INSERT INTO "public"."video_backfill_jobs"
        ("platform", "account_id", "talent_id", "status", "requested_at", "finished_at")
      VALUES ('youtube', 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'done', '2026-11-04T00:00:00Z', '2026-11-04T00:10:00Z')$$,
    '42501',
    NULL,
    'admins cannot record jobs'
);

SELECT throws_ok(
    $$DELETE FROM "public"."video_backfill_jobs"$$,
    '42501',
    NULL,
    'admins cannot delete the history'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Lifecycle: the history of a talent goes with it
-- ---------------------------------------------------------------------------
DELETE FROM "public"."youtube_channels" WHERE "talent_id" = 'e0000000-0000-0000-0000-000000000002';
DELETE FROM "public"."talents" WHERE "id" = 'e0000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT count(*)::integer FROM "public"."video_backfill_jobs" WHERE "talent_id" = 'e0000000-0000-0000-0000-000000000002'),
    0,
    'the history of a talent that is deleted for good is deleted too'
);

SELECT * FROM finish();

ROLLBACK;
