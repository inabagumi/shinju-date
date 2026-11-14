-- Tests for the profile_images schema (#6525). Run with `supabase test db`.
BEGIN;

SELECT plan(24);

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
SELECT has_table('public', 'profile_images', 'profile_images table exists');
SELECT col_not_null('public', 'profile_images', 'path', 'path is required');
SELECT col_not_null('public', 'profile_images', 'blur_data_url', 'blur_data_url is required');
SELECT col_is_null('public', 'profile_images', 'etag', 'etag is optional');
SELECT col_not_null('public', 'profile_images', 'source_url', 'source_url is required');
SELECT col_is_null('public', 'youtube_channels', 'profile_image_id', 'a YouTube channel may have no icon');
SELECT col_is_null('public', 'twitch_users', 'profile_image_id', 'a Twitch user may have no icon');
SELECT fk_ok('public', 'youtube_channels', 'profile_image_id', 'public', 'profile_images', 'id');
SELECT fk_ok('public', 'twitch_users', 'profile_image_id', 'public', 'profile_images', 'id');

SELECT is(
    (SELECT "public" FROM "storage"."buckets" WHERE "id" = 'profile-images'),
    false,
    'profile-images bucket exists and is private'
);

-- ---------------------------------------------------------------------------
-- Fixtures: an active talent and a deleted talent, each with a channel and a
-- Twitch user, plus icons in use and an unused icon.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."talents" ("id", "name", "deleted_at")
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Active talent', NULL),
    ('f0000000-0000-0000-0000-000000000002', 'Deleted talent', NOW());

INSERT INTO "public"."profile_images" ("id", "path", "width", "height", "blur_data_url", "etag", "source_url")
VALUES
    ('f1000000-0000-0000-0000-000000000001', 'youtube/UCtest1/a.webp', 256, 256, 'data:image/jpeg;base64,', '"yt-1"', 'https://yt3.example/a'),
    ('f1000000-0000-0000-0000-000000000002', 'twitch/900001/a.webp', 256, 256, 'data:image/jpeg;base64,', '"tw-1"', 'https://twitch.example/a'),
    ('f1000000-0000-0000-0000-000000000003', 'youtube/UCtest2/a.webp', 256, 256, 'data:image/jpeg;base64,', NULL, 'https://yt3.example/b'),
    ('f1000000-0000-0000-0000-000000000004', 'youtube/UCtest1/unused.webp', 256, 256, 'data:image/jpeg;base64,', NULL, 'https://yt3.example/c');

INSERT INTO "public"."youtube_channels" ("id", "talent_id", "youtube_channel_id", "profile_image_id")
VALUES
    ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'UCtest1', 'f1000000-0000-0000-0000-000000000001'),
    ('f2000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'UCtest2', 'f1000000-0000-0000-0000-000000000003');

INSERT INTO "public"."twitch_users" ("id", "talent_id", "twitch_user_id", "profile_image_id")
VALUES
    ('f3000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '900001', 'f1000000-0000-0000-0000-000000000002');

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------
SELECT throws_ok(
    $$INSERT INTO "public"."profile_images" ("path", "width", "height", "blur_data_url", "source_url")
      VALUES ('youtube/UCtest1/wide.webp', 320, 180, 'data:image/jpeg;base64,', 'https://yt3.example/e')$$,
    '23514',
    NULL,
    'non-square images are rejected'
);

SELECT throws_ok(
    $$INSERT INTO "public"."profile_images" ("path", "width", "height", "blur_data_url", "source_url")
      VALUES ('youtube/UCtest1/a.webp', 256, 256, 'data:image/jpeg;base64,', 'https://yt3.example/f')$$,
    '23505',
    NULL,
    'storage paths are unique'
);

SELECT throws_ok(
    $$UPDATE "public"."youtube_channels"
      SET "profile_image_id" = 'f1000000-0000-0000-0000-000000000001'
      WHERE "id" = 'f2000000-0000-0000-0000-000000000002'$$,
    '23505',
    NULL,
    'an icon belongs to a single channel'
);

SELECT throws_ok(
    $$DELETE FROM "public"."profile_images" WHERE "id" = 'f1000000-0000-0000-0000-000000000001'$$,
    '23503',
    NULL,
    'an icon used by a YouTube channel cannot be deleted'
);

SELECT throws_ok(
    $$DELETE FROM "public"."profile_images" WHERE "id" = 'f1000000-0000-0000-0000-000000000002'$$,
    '23503',
    NULL,
    'an icon used by a Twitch user cannot be deleted'
);

-- ---------------------------------------------------------------------------
-- RLS: anon only sees icons in use by talents that are not deleted
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "anon";

SELECT results_eq(
    $$SELECT "id" FROM "public"."profile_images" WHERE "path" LIKE 'youtube/UCtest%' OR "path" LIKE 'twitch/9000%' ORDER BY "id"$$,
    $$VALUES ('f1000000-0000-0000-0000-000000000001'::"uuid"), ('f1000000-0000-0000-0000-000000000002'::"uuid")$$,
    'anon sees only icons in use by talents that are not deleted'
);

SELECT throws_ok(
    $$INSERT INTO "public"."profile_images" ("path", "width", "height", "blur_data_url", "source_url")
      VALUES ('youtube/UCtest1/anon.webp', 256, 256, 'data:image/jpeg;base64,', 'https://yt3.example/g')$$,
    '42501',
    NULL,
    'anon cannot insert icons'
);

RESET ROLE;
SET LOCAL ROLE "authenticated";

SELECT is(
    (SELECT count(*)::integer FROM "public"."profile_images" WHERE "path" LIKE 'youtube/UCtest%' OR "path" LIKE 'twitch/9000%'),
    4,
    'authenticated users see every icon, including unused ones'
);

SELECT throws_ok(
    $$DELETE FROM "public"."profile_images" WHERE "id" = 'f1000000-0000-0000-0000-000000000004'$$,
    '42501',
    NULL,
    'authenticated users cannot delete icons'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Lifecycle: replacing an icon, then deleting a channel
-- ---------------------------------------------------------------------------
INSERT INTO "public"."profile_images" ("id", "path", "width", "height", "blur_data_url", "etag", "source_url")
VALUES ('f1000000-0000-0000-0000-000000000005', 'youtube/UCtest1/b.webp', 256, 256, 'data:image/jpeg;base64,', '"yt-2"', 'https://yt3.example/d');

SELECT lives_ok(
    $$UPDATE "public"."youtube_channels"
      SET "profile_image_id" = 'f1000000-0000-0000-0000-000000000005'
      WHERE "id" = 'f2000000-0000-0000-0000-000000000001'$$,
    'a channel can switch to a new icon'
);

SELECT lives_ok(
    $$DELETE FROM "public"."profile_images" WHERE "id" = 'f1000000-0000-0000-0000-000000000001'$$,
    'the replaced icon can be deleted'
);

SET LOCAL ROLE "anon";

SELECT is(
    (SELECT count(*)::integer FROM "public"."profile_images" WHERE "id" = 'f1000000-0000-0000-0000-000000000005'),
    1,
    'anon sees the new icon'
);

RESET ROLE;

DELETE FROM "public"."youtube_channels" WHERE "id" = 'f2000000-0000-0000-0000-000000000001';

SET LOCAL ROLE "anon";

SELECT is(
    (SELECT count(*)::integer FROM "public"."profile_images" WHERE "id" = 'f1000000-0000-0000-0000-000000000005'),
    0,
    'anon no longer sees the icon of a deleted channel'
);

RESET ROLE;

SELECT lives_ok(
    $$DELETE FROM "public"."profile_images" WHERE "id" = 'f1000000-0000-0000-0000-000000000005'$$,
    'the icon of a deleted channel can be deleted'
);

SELECT * FROM finish();

ROLLBACK;
