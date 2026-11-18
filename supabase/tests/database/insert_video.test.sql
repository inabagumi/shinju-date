-- Tests for inserting a video together with its platform row (#7078). Run
-- with `supabase test db`.
BEGIN;

SELECT plan(26);

SELECT function_returns(
    'public', 'insert_video',
    ARRAY['jsonb', 'platform_type', 'jsonb'],
    'uuid',
    'insert_video(jsonb, platform_type, jsonb) returns uuid'
);

-- ---------------------------------------------------------------------------
-- Only the service role may call it.
-- ---------------------------------------------------------------------------
SELECT ok(
    NOT has_function_privilege('anon', 'public.insert_video(jsonb, public.platform_type, jsonb)', 'EXECUTE'),
    'anon cannot call insert_video'
);

SELECT ok(
    NOT has_function_privilege('authenticated', 'public.insert_video(jsonb, public.platform_type, jsonb)', 'EXECUTE'),
    'authenticated (including admins) cannot call insert_video'
);

SELECT ok(
    has_function_privilege('service_role', 'public.insert_video(jsonb, public.platform_type, jsonb)', 'EXECUTE'),
    'the service role can call insert_video'
);

-- ---------------------------------------------------------------------------
-- Fixtures: a talent with a YouTube channel and a Twitch user.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."talents" ("id", "name")
VALUES ('e1000000-0000-0000-0000-000000000001', 'Insert video talent');

INSERT INTO "public"."youtube_channels" ("id", "talent_id", "youtube_channel_id")
VALUES ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'UC-insert-video');

INSERT INTO "public"."twitch_users" ("id", "talent_id", "twitch_user_id")
VALUES ('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'insert-video-user');

INSERT INTO "public"."thumbnails" ("id", "path", "blur_data_url", "width", "height")
VALUES ('e4000000-0000-0000-0000-000000000001', 'insert-video/1.jpg', 'data:image/jpeg;base64,', 1280, 720);

CREATE TEMPORARY TABLE "inserted" ("name" text PRIMARY KEY, "video_id" uuid);
GRANT ALL ON TABLE "inserted" TO "service_role";

SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

-- ---------------------------------------------------------------------------
-- Inserting a YouTube video
-- ---------------------------------------------------------------------------
INSERT INTO "inserted"
SELECT 'youtube', "public"."insert_video"(
    jsonb_build_object(
        'id', 'e5000000-0000-0000-0000-0000000000ff',
        'talent_id', 'e1000000-0000-0000-0000-000000000001',
        'thumbnail_id', 'e4000000-0000-0000-0000-000000000001',
        'title', 'YouTube video',
        'duration', 'PT10M',
        'published_at', '2026-11-18T00:00:00Z',
        'platform', 'youtube',
        'status', 'PUBLISHED',
        'created_at', '2026-11-18T01:00:00Z',
        'updated_at', '2026-11-18T01:00:00Z'
    ),
    'youtube',
    jsonb_build_object(
        'video_id', 'e5000000-0000-0000-0000-0000000000fe',
        'youtube_channel_id', 'e2000000-0000-0000-0000-000000000001',
        'youtube_video_id', 'insert-video-yt-1'
    )
);

RESET ROLE;

SELECT isnt(
    (SELECT "video_id" FROM "inserted" WHERE "name" = 'youtube'),
    NULL,
    'returns the ID of the new video'
);

SELECT isnt(
    (SELECT "video_id" FROM "inserted" WHERE "name" = 'youtube'),
    'e5000000-0000-0000-0000-0000000000ff'::uuid,
    'the function sets the ID of the video, not the caller'
);

SELECT results_eq(
    $$SELECT "talent_id", "thumbnail_id", "title", "duration", "published_at", "platform"::text, "status"::text, "created_at", "visible", "video_kind"::text, "deleted_at"
      FROM "public"."videos"
      WHERE "id" = (SELECT "video_id" FROM "inserted" WHERE "name" = 'youtube')$$,
    $$VALUES (
        'e1000000-0000-0000-0000-000000000001'::uuid,
        'e4000000-0000-0000-0000-000000000001'::uuid,
        'YouTube video',
        'PT10M',
        '2026-11-18T00:00:00Z'::timestamptz,
        'youtube',
        'PUBLISHED',
        '2026-11-18T01:00:00Z'::timestamptz,
        true,
        'standard',
        NULL::timestamptz
    )$$,
    'inserts the videos row with the given columns and the defaults of the others'
);

SELECT results_eq(
    $$SELECT "video_id", "youtube_channel_id", "youtube_video_id"
      FROM "public"."youtube_videos"
      WHERE "youtube_video_id" = 'insert-video-yt-1'$$,
    $$SELECT "video_id", 'e2000000-0000-0000-0000-000000000001'::uuid, 'insert-video-yt-1'
      FROM "inserted" WHERE "name" = 'youtube'$$,
    'inserts the youtube_videos row of the new video'
);

-- ---------------------------------------------------------------------------
-- Inserting a Twitch video
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

INSERT INTO "inserted"
SELECT 'twitch', "public"."insert_video"(
    jsonb_build_object(
        'talent_id', 'e1000000-0000-0000-0000-000000000001',
        'title', 'Twitch stream',
        'duration', 'PT0S',
        'published_at', '2026-11-18T02:00:00Z',
        'status', 'LIVE'
    ),
    'twitch',
    jsonb_build_object(
        'twitch_user_id', 'e3000000-0000-0000-0000-000000000001',
        'twitch_video_id', 'live:insert-video-stream-1',
        'stream_id', 'insert-video-stream-1',
        'type', NULL
    )
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "v"."platform"::text, "v"."status"::text, "t"."twitch_video_id", "t"."stream_id", "t"."type"::text
      FROM "public"."videos" AS "v"
      JOIN "public"."twitch_videos" AS "t" ON "t"."video_id" = "v"."id"
      WHERE "v"."id" = (SELECT "video_id" FROM "inserted" WHERE "name" = 'twitch')$$,
    $$VALUES ('twitch', 'LIVE', 'live:insert-video-stream-1', 'insert-video-stream-1', NULL)$$,
    'inserts a Twitch video with its twitch_videos row, and sets the platform of the video'
);

-- ---------------------------------------------------------------------------
-- A video that is already saved (another run saved it first) inserts
-- nothing and returns NULL.
-- ---------------------------------------------------------------------------
CREATE TEMPORARY TABLE "video_count" AS
SELECT count(*) AS "count" FROM "public"."videos";
GRANT ALL ON TABLE "video_count" TO "service_role";

SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT is(
    "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-000000000001',
            'title', 'YouTube video again',
            'duration', 'PT10M',
            'published_at', '2026-11-18T00:00:00Z'
        ),
        'youtube',
        jsonb_build_object(
            'youtube_channel_id', 'e2000000-0000-0000-0000-000000000001',
            'youtube_video_id', 'insert-video-yt-1'
        )
    ),
    NULL,
    'returns NULL when the YouTube video is already saved'
);

SELECT is(
    "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-000000000001',
            'title', 'Twitch stream again',
            'duration', 'PT0S',
            'published_at', '2026-11-18T02:00:00Z'
        ),
        'twitch',
        jsonb_build_object(
            'twitch_user_id', 'e3000000-0000-0000-0000-000000000001',
            'twitch_video_id', 'live:insert-video-stream-1'
        )
    ),
    NULL,
    'returns NULL when the Twitch video is already saved'
);

SELECT is(
    "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-000000000001',
            'title', 'Twitch archive',
            'duration', 'PT1H',
            'published_at', '2026-11-18T02:00:00Z'
        ),
        'twitch',
        jsonb_build_object(
            'twitch_user_id', 'e3000000-0000-0000-0000-000000000001',
            'twitch_video_id', 'insert-video-archive-1',
            'stream_id', 'insert-video-stream-1'
        )
    ),
    NULL,
    'returns NULL when a Twitch video of the same stream is already saved'
);

RESET ROLE;

SELECT is(
    (SELECT count(*) FROM "public"."videos"),
    (SELECT "count" FROM "video_count"),
    'a video that is already saved leaves no videos row'
);

SELECT is_empty(
    $$SELECT 1 FROM "public"."videos" WHERE "title" IN ('YouTube video again', 'Twitch stream again', 'Twitch archive')$$,
    'the videos rows of the videos already saved are not inserted'
);

-- ---------------------------------------------------------------------------
-- When the platform row cannot be inserted, the videos row is not left
-- either.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT throws_ok(
    $$SELECT "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-000000000001',
            'title', 'Video of a missing channel',
            'duration', 'PT10M',
            'published_at', '2026-11-18T00:00:00Z'
        ),
        'youtube',
        jsonb_build_object(
            'youtube_channel_id', 'e2000000-0000-0000-0000-0000000000ff',
            'youtube_video_id', 'insert-video-yt-2'
        )
    )$$,
    '23503',
    NULL,
    'a platform row that breaks a foreign key fails the call'
);

SELECT throws_ok(
    $$SELECT "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-000000000001',
            'title', 'Video without a platform ID',
            'duration', 'PT10M',
            'published_at', '2026-11-18T00:00:00Z'
        ),
        'youtube',
        jsonb_build_object('youtube_channel_id', 'e2000000-0000-0000-0000-000000000001')
    )$$,
    '23502',
    NULL,
    'a platform row without a required column fails the call'
);

SELECT throws_ok(
    $$SELECT "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-000000000001',
            'title', 'Video with an unknown column',
            'duration', 'PT10M',
            'published_at', '2026-11-18T00:00:00Z'
        ),
        'youtube',
        jsonb_build_object(
            'youtube_channel_id', 'e2000000-0000-0000-0000-000000000001',
            'youtube_video_id', 'insert-video-yt-3',
            'unknown_column', 'value'
        )
    )$$,
    '42703',
    NULL,
    'a key that is not a column of the platform table fails the call'
);

RESET ROLE;

SELECT is_empty(
    $$SELECT 1 FROM "public"."videos"
      WHERE "title" IN ('Video of a missing channel', 'Video without a platform ID', 'Video with an unknown column')$$,
    'the videos row is not left when its platform row cannot be inserted'
);

SELECT is(
    (SELECT count(*) FROM "public"."videos"),
    (SELECT "count" FROM "video_count"),
    'a failed call leaves no videos row'
);

-- ---------------------------------------------------------------------------
-- A videos row that cannot be inserted fails the call before the platform
-- row.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT throws_ok(
    $$SELECT "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-000000000001',
            'duration', 'PT10M',
            'published_at', '2026-11-18T00:00:00Z'
        ),
        'youtube',
        jsonb_build_object(
            'youtube_channel_id', 'e2000000-0000-0000-0000-000000000001',
            'youtube_video_id', 'insert-video-yt-4'
        )
    )$$,
    '23502',
    NULL,
    'a videos row without a required column fails the call'
);

SELECT throws_ok(
    $$SELECT "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-0000000000ff',
            'title', 'Video of a missing talent',
            'duration', 'PT10M',
            'published_at', '2026-11-18T00:00:00Z'
        ),
        'youtube',
        jsonb_build_object(
            'youtube_channel_id', 'e2000000-0000-0000-0000-000000000001',
            'youtube_video_id', 'insert-video-yt-5'
        )
    )$$,
    '23503',
    NULL,
    'a videos row that breaks a foreign key fails the call'
);

-- ---------------------------------------------------------------------------
-- Arguments
-- ---------------------------------------------------------------------------
SELECT throws_ok(
    $$SELECT "public"."insert_video"(
        jsonb_build_object(
            'talent_id', 'e1000000-0000-0000-0000-000000000001',
            'title', 'Video of another platform',
            'duration', 'PT10M',
            'published_at', '2026-11-18T00:00:00Z',
            'platform', 'twitch'
        ),
        'youtube',
        jsonb_build_object(
            'youtube_channel_id', 'e2000000-0000-0000-0000-000000000001',
            'youtube_video_id', 'insert-video-yt-6'
        )
    )$$,
    '22023',
    NULL,
    'a platform of the video that differs from p_platform is rejected'
);

SELECT throws_ok(
    $$SELECT "public"."insert_video"('{}'::jsonb, NULL, '{}'::jsonb)$$,
    '22023',
    NULL,
    'a NULL platform is rejected'
);

SELECT throws_ok(
    $$SELECT "public"."insert_video"('[]'::jsonb, 'youtube', '{}'::jsonb)$$,
    '22023',
    NULL,
    'a video that is not an object is rejected'
);

SELECT throws_ok(
    $$SELECT "public"."insert_video"('{}'::jsonb, 'youtube', NULL)$$,
    '22023',
    NULL,
    'a NULL platform video is rejected'
);

RESET ROLE;

SELECT is_empty(
    $$SELECT 1 FROM "public"."youtube_videos"
      WHERE "youtube_video_id" IN ('insert-video-yt-2', 'insert-video-yt-3', 'insert-video-yt-4', 'insert-video-yt-5', 'insert-video-yt-6')$$,
    'no platform row is left by a failed call'
);

SELECT * FROM finish();
ROLLBACK;
