-- Tests for soft-deleting and restoring videos together with their thumbnails
-- (#7077). Run with `supabase test db`.
BEGIN;

SELECT plan(26);

SELECT function_returns(
    'public', 'soft_delete_videos',
    ARRAY['uuid[]', 'video_deleted_reason', 'timestamp with time zone'],
    'setof uuid',
    'soft_delete_videos(uuid[], video_deleted_reason, timestamptz) returns setof uuid'
);

SELECT function_returns(
    'public', 'restore_videos',
    ARRAY['uuid[]', 'video_deleted_reason'],
    'setof uuid',
    'restore_videos(uuid[], video_deleted_reason) returns setof uuid'
);

-- ---------------------------------------------------------------------------
-- Fixtures: an admin, a signed-in user without the admin role, and videos
-- with thumbnails.
--   1: not deleted, with a thumbnail
--   2: not deleted, without a thumbnail
--   3: deleted by an admin (withdrawn), with a thumbnail
--   4: deleted because its talent was deleted (talent_deleted), with a thumbnail
--   5: not deleted, with a thumbnail (for the permission checks)
-- ---------------------------------------------------------------------------
INSERT INTO "auth"."users" ("id", "email", "raw_app_meta_data")
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'videos-admin@example.test', '{"provider": "email", "role": "admin"}'),
    ('d0000000-0000-0000-0000-000000000002', 'videos-member@example.test', '{"provider": "email"}');

INSERT INTO "public"."talents" ("id", "name")
VALUES ('d1000000-0000-0000-0000-000000000001', 'Soft delete talent');

INSERT INTO "public"."thumbnails" ("id", "path", "blur_data_url", "width", "height", "deleted_at")
VALUES
    ('d2000000-0000-0000-0000-000000000001', 'soft-delete/1.jpg', 'data:image/jpeg;base64,', 1280, 720, NULL),
    ('d2000000-0000-0000-0000-000000000003', 'soft-delete/3.jpg', 'data:image/jpeg;base64,', 1280, 720, '2026-01-01T00:00:00Z'),
    ('d2000000-0000-0000-0000-000000000004', 'soft-delete/4.jpg', 'data:image/jpeg;base64,', 1280, 720, '2026-01-02T00:00:00Z'),
    ('d2000000-0000-0000-0000-000000000005', 'soft-delete/5.jpg', 'data:image/jpeg;base64,', 1280, 720, NULL);

INSERT INTO "public"."videos" ("id", "talent_id", "thumbnail_id", "title", "duration", "published_at", "platform", "deleted_at", "deleted_reason")
VALUES
    ('d3000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'Video 1', 'PT1H', '2026-11-01T00:00:00Z', 'youtube', NULL, NULL),
    ('d3000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', NULL, 'Video 2', 'PT1H', '2026-11-02T00:00:00Z', 'youtube', NULL, NULL),
    ('d3000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000003', 'Video 3', 'PT1H', '2026-11-03T00:00:00Z', 'youtube', '2026-01-01T00:00:00Z', 'withdrawn'),
    ('d3000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000004', 'Video 4', 'PT1H', '2026-11-04T00:00:00Z', 'youtube', '2026-01-02T00:00:00Z', 'talent_deleted'),
    ('d3000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000005', 'Video 5', 'PT1H', '2026-11-05T00:00:00Z', 'youtube', NULL, NULL);

-- ---------------------------------------------------------------------------
-- anon and a user without the admin role
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "anon";
SELECT set_config('request.jwt.claims', '{"role": "anon"}', true);

SELECT throws_ok(
    $$SELECT "public"."soft_delete_videos"(ARRAY['d3000000-0000-0000-0000-000000000005']::uuid[], 'withdrawn', NOW())$$,
    '42501',
    NULL,
    'anon cannot soft-delete videos'
);

SELECT throws_ok(
    $$SELECT "public"."restore_videos"(ARRAY['d3000000-0000-0000-0000-000000000003']::uuid[])$$,
    '42501',
    NULL,
    'anon cannot restore videos'
);

RESET ROLE;

SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);

SELECT throws_ok(
    $$SELECT "public"."soft_delete_videos"(ARRAY['d3000000-0000-0000-0000-000000000005']::uuid[], 'withdrawn', NOW())$$,
    '42501',
    'permission denied for function soft_delete_videos',
    'a user without the admin role cannot soft-delete videos'
);

SELECT throws_ok(
    $$SELECT "public"."restore_videos"(ARRAY['d3000000-0000-0000-0000-000000000003']::uuid[])$$,
    '42501',
    'permission denied for function restore_videos',
    'a user without the admin role cannot restore videos'
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "v"."deleted_at", "t"."deleted_at"
      FROM "public"."videos" AS "v"
      JOIN "public"."thumbnails" AS "t" ON "t"."id" = "v"."thumbnail_id"
      WHERE "v"."id" IN ('d3000000-0000-0000-0000-000000000003', 'd3000000-0000-0000-0000-000000000005')
      ORDER BY "v"."id"$$,
    $$VALUES
        ('2026-01-01T00:00:00Z'::timestamptz, '2026-01-01T00:00:00Z'::timestamptz),
        (NULL::timestamptz, NULL::timestamptz)$$,
    'nothing changes when the caller has no permission'
);

-- ---------------------------------------------------------------------------
-- Soft-deleting (the service role, as the scraper and the batch call it)
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT throws_ok(
    $$SELECT "public"."soft_delete_videos"(ARRAY['d3000000-0000-0000-0000-000000000001']::uuid[], NULL, NOW())$$,
    '22023',
    NULL,
    'a NULL reason is rejected'
);

SELECT throws_ok(
    $$SELECT "public"."soft_delete_videos"(ARRAY['d3000000-0000-0000-0000-000000000001']::uuid[], 'unavailable', NULL)$$,
    '22023',
    NULL,
    'a NULL time is rejected'
);

SELECT results_eq(
    $$SELECT * FROM "public"."soft_delete_videos"(
        ARRAY[
            'd3000000-0000-0000-0000-000000000001',
            'd3000000-0000-0000-0000-000000000002',
            'd3000000-0000-0000-0000-000000000003',
            'd3000000-0000-0000-0000-000000000004',
            'd3000000-0000-0000-0000-0000000000ff'
        ]::uuid[],
        'unavailable',
        '2026-11-18T00:00:00Z'
    )$$,
    $$VALUES
        ('d3000000-0000-0000-0000-000000000001'::uuid),
        ('d3000000-0000-0000-0000-000000000002'::uuid)$$,
    'returns only the videos that were not deleted yet'
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "id", "deleted_at", "deleted_reason"::text
      FROM "public"."videos"
      WHERE "id" IN (
          'd3000000-0000-0000-0000-000000000001',
          'd3000000-0000-0000-0000-000000000002',
          'd3000000-0000-0000-0000-000000000003',
          'd3000000-0000-0000-0000-000000000004'
      )
      ORDER BY "id"$$,
    $$VALUES
        ('d3000000-0000-0000-0000-000000000001'::uuid, '2026-11-18T00:00:00Z'::timestamptz, 'unavailable'),
        ('d3000000-0000-0000-0000-000000000002'::uuid, '2026-11-18T00:00:00Z'::timestamptz, 'unavailable'),
        ('d3000000-0000-0000-0000-000000000003'::uuid, '2026-01-01T00:00:00Z'::timestamptz, 'withdrawn'),
        ('d3000000-0000-0000-0000-000000000004'::uuid, '2026-01-02T00:00:00Z'::timestamptz, 'talent_deleted')$$,
    'deletes the videos that were not deleted, and keeps the reason and the time of the videos deleted earlier'
);

SELECT results_eq(
    $$SELECT "id", "deleted_at"
      FROM "public"."thumbnails"
      WHERE "id" IN (
          'd2000000-0000-0000-0000-000000000001',
          'd2000000-0000-0000-0000-000000000003',
          'd2000000-0000-0000-0000-000000000004'
      )
      ORDER BY "id"$$,
    $$VALUES
        ('d2000000-0000-0000-0000-000000000001'::uuid, '2026-11-18T00:00:00Z'::timestamptz),
        ('d2000000-0000-0000-0000-000000000003'::uuid, '2026-01-01T00:00:00Z'::timestamptz),
        ('d2000000-0000-0000-0000-000000000004'::uuid, '2026-01-02T00:00:00Z'::timestamptz)$$,
    'deletes the thumbnails of the deleted videos with them, and leaves the others'
);

SELECT ok(
    (SELECT "updated_at" > '2026-11-18T00:00:00Z' FROM "public"."videos" WHERE "id" = 'd3000000-0000-0000-0000-000000000001'),
    'the trigger sets updated_at of the deleted videos'
);

SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT is_empty(
    $$SELECT * FROM "public"."soft_delete_videos"(ARRAY['d3000000-0000-0000-0000-000000000001']::uuid[], 'talent_deleted', '2026-11-19T00:00:00Z')$$,
    'deleting a deleted video again returns nothing'
);

SELECT is(
    (SELECT ROW("deleted_at", "deleted_reason"::text) FROM "public"."videos" WHERE "id" = 'd3000000-0000-0000-0000-000000000001'),
    ROW('2026-11-18T00:00:00Z'::timestamptz, 'unavailable'::text),
    'deleting a deleted video again keeps its reason and time'
);

SELECT is_empty(
    $$SELECT * FROM "public"."soft_delete_videos"(ARRAY[]::uuid[], 'unavailable', NOW())$$,
    'an empty array deletes nothing'
);

-- ---------------------------------------------------------------------------
-- Restoring with a reason (the batch, when a talent is restored)
-- ---------------------------------------------------------------------------
SELECT results_eq(
    $$SELECT * FROM "public"."restore_videos"(
        ARRAY[
            'd3000000-0000-0000-0000-000000000001',
            'd3000000-0000-0000-0000-000000000003',
            'd3000000-0000-0000-0000-000000000004',
            'd3000000-0000-0000-0000-000000000005'
        ]::uuid[],
        'talent_deleted'
    )$$,
    $$VALUES ('d3000000-0000-0000-0000-000000000004'::uuid)$$,
    'restores only the videos deleted for the given reason'
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "v"."id", "v"."deleted_at", "v"."deleted_reason"::text, "t"."deleted_at"
      FROM "public"."videos" AS "v"
      JOIN "public"."thumbnails" AS "t" ON "t"."id" = "v"."thumbnail_id"
      WHERE "v"."id" IN (
          'd3000000-0000-0000-0000-000000000001',
          'd3000000-0000-0000-0000-000000000003',
          'd3000000-0000-0000-0000-000000000004'
      )
      ORDER BY "v"."id"$$,
    $$VALUES
        ('d3000000-0000-0000-0000-000000000001'::uuid, '2026-11-18T00:00:00Z'::timestamptz, 'unavailable', '2026-11-18T00:00:00Z'::timestamptz),
        ('d3000000-0000-0000-0000-000000000003'::uuid, '2026-01-01T00:00:00Z'::timestamptz, 'withdrawn', '2026-01-01T00:00:00Z'::timestamptz),
        ('d3000000-0000-0000-0000-000000000004'::uuid, NULL::timestamptz, NULL, NULL::timestamptz)$$,
    'a video withdrawn by an admin stays deleted with its thumbnail when the talent is restored'
);

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);

SELECT results_eq(
    $$SELECT * FROM "public"."soft_delete_videos"(
        ARRAY['d3000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000005']::uuid[],
        'withdrawn',
        '2026-11-20T00:00:00Z'
    )$$,
    $$VALUES ('d3000000-0000-0000-0000-000000000005'::uuid)$$,
    'an admin can soft-delete videos, and a video deleted for another reason is not withdrawn'
);

SELECT is(
    (SELECT ROW("deleted_at", "deleted_reason"::text) FROM "public"."videos" WHERE "id" = 'd3000000-0000-0000-0000-000000000001'),
    ROW('2026-11-18T00:00:00Z'::timestamptz, 'unavailable'::text),
    'an admin deleting a video deleted as unavailable keeps its reason and time'
);

SELECT is(
    (SELECT "deleted_at" FROM "public"."thumbnails" WHERE "id" = 'd2000000-0000-0000-0000-000000000005'),
    '2026-11-20T00:00:00Z'::timestamptz,
    'an admin deletes the thumbnail with the video'
);

SELECT results_eq(
    $$SELECT * FROM "public"."restore_videos"(
        ARRAY[
            'd3000000-0000-0000-0000-000000000001',
            'd3000000-0000-0000-0000-000000000002',
            'd3000000-0000-0000-0000-000000000003',
            'd3000000-0000-0000-0000-000000000004'
        ]::uuid[]
    )$$,
    $$VALUES
        ('d3000000-0000-0000-0000-000000000001'::uuid),
        ('d3000000-0000-0000-0000-000000000002'::uuid),
        ('d3000000-0000-0000-0000-000000000003'::uuid)$$,
    'without a reason, an admin restores the deleted videos whatever the reason, and not the videos that are not deleted'
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "id", "deleted_at", "deleted_reason"::text
      FROM "public"."videos"
      WHERE "id" IN (
          'd3000000-0000-0000-0000-000000000001',
          'd3000000-0000-0000-0000-000000000002',
          'd3000000-0000-0000-0000-000000000003'
      )
      ORDER BY "id"$$,
    $$VALUES
        ('d3000000-0000-0000-0000-000000000001'::uuid, NULL::timestamptz, NULL),
        ('d3000000-0000-0000-0000-000000000002'::uuid, NULL::timestamptz, NULL),
        ('d3000000-0000-0000-0000-000000000003'::uuid, NULL::timestamptz, NULL)$$,
    'the restored videos have neither a time nor a reason of deletion'
);

SELECT results_eq(
    $$SELECT "id", "deleted_at"
      FROM "public"."thumbnails"
      WHERE "id" IN (
          'd2000000-0000-0000-0000-000000000001',
          'd2000000-0000-0000-0000-000000000003',
          'd2000000-0000-0000-0000-000000000005'
      )
      ORDER BY "id"$$,
    $$VALUES
        ('d2000000-0000-0000-0000-000000000001'::uuid, NULL::timestamptz),
        ('d2000000-0000-0000-0000-000000000003'::uuid, NULL::timestamptz),
        ('d2000000-0000-0000-0000-000000000005'::uuid, '2026-11-20T00:00:00Z'::timestamptz)$$,
    'restores the thumbnails of the restored videos with them, and leaves the others'
);

-- ---------------------------------------------------------------------------
-- A video and its thumbnail are updated in one transaction: when the
-- thumbnail cannot be updated, the video is not deleted either.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "pg_temp"."fail_thumbnail_update"() RETURNS trigger
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'thumbnail update failed';
END;
$$;

CREATE TRIGGER "fail_thumbnail_update"
    BEFORE UPDATE ON "public"."thumbnails"
    FOR EACH ROW
    WHEN (OLD."id" = 'd2000000-0000-0000-0000-000000000001')
    EXECUTE FUNCTION "pg_temp"."fail_thumbnail_update"();

SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT throws_ok(
    $$SELECT "public"."soft_delete_videos"(ARRAY['d3000000-0000-0000-0000-000000000001']::uuid[], 'unavailable', NOW())$$,
    'P0001',
    'thumbnail update failed',
    'a failure to delete the thumbnail fails the call'
);

RESET ROLE;

SELECT is(
    (SELECT ROW("deleted_at", "deleted_reason"::text) FROM "public"."videos" WHERE "id" = 'd3000000-0000-0000-0000-000000000001'),
    ROW(NULL::timestamptz, NULL::text),
    'the video is not deleted when its thumbnail cannot be deleted'
);

SELECT * FROM finish();
ROLLBACK;
