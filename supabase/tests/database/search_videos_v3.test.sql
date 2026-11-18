-- Tests for the video search by kind (#6804) and its pages, which leave out the
-- videos the site does not show (#7200) or cannot link to (#7050). Run with
-- `supabase test db`.
BEGIN;

SELECT plan(17);

-- ---------------------------------------------------------------------------
-- Fixtures: a talent with regular videos and shorts, and a deleted talent.
-- The searches are limited to these talents so the seed data does not affect
-- the results.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."talents" ("id", "name", "deleted_at")
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Search talent', NULL),
    ('e0000000-0000-0000-0000-000000000002', 'Deleted talent', NOW());

INSERT INTO "public"."youtube_channels" ("id", "talent_id", "youtube_channel_id")
VALUES
    ('e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'UCsearch1'),
    ('e2000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'UCsearch2');

INSERT INTO "public"."videos" ("id", "talent_id", "title", "duration", "published_at", "platform", "status", "video_kind")
VALUES
    ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '歌枠 その1', 'PT1H', '2026-11-10T12:00:00Z', 'youtube', 'ENDED', 'standard'),
    ('e1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', '歌ってみた ショート', 'PT30S', '2026-11-11T12:00:00Z', 'youtube', 'PUBLISHED', 'short'),
    ('e1000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'ゲーム実況', 'PT2H', '2026-11-12T12:00:00Z', 'youtube', 'ENDED', 'standard'),
    ('e1000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', '歌枠 その2', 'PT1H', '2026-11-13T12:00:00Z', 'youtube', 'ENDED', 'standard'),
    -- The newest videos are the ones the site does not show, so they would
    -- take up a page if they were left out after the page size is applied.
    -- A video of the deleted talent
    ('e1000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', '歌枠 削除済み', 'PT1H', '2026-11-14T12:00:00Z', 'youtube', 'ENDED', 'standard'),
    -- A video with neither a YouTube nor a Twitch video
    ('e1000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', '歌枠 動画なし', 'PT1H', '2026-11-14T13:00:00Z', 'youtube', 'ENDED', 'standard');

INSERT INTO "public"."youtube_videos" ("video_id", "youtube_video_id", "youtube_channel_id")
VALUES
    ('e1000000-0000-0000-0000-000000000001', 'YTsearch0001', 'e2000000-0000-0000-0000-000000000001'),
    ('e1000000-0000-0000-0000-000000000002', 'YTsearch0002', 'e2000000-0000-0000-0000-000000000001'),
    ('e1000000-0000-0000-0000-000000000003', 'YTsearch0003', 'e2000000-0000-0000-0000-000000000001'),
    ('e1000000-0000-0000-0000-000000000004', 'YTsearch0004', 'e2000000-0000-0000-0000-000000000001'),
    ('e1000000-0000-0000-0000-000000000005', 'YTsearch0005', 'e2000000-0000-0000-0000-000000000002');

-- ---------------------------------------------------------------------------
-- Fixtures: a talent with videos on Twitch, some of which the site cannot link
-- to. They are the newest, so they would take up a page if they were left out
-- after the page size is applied.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."talents" ("id", "name")
VALUES ('e0000000-0000-0000-0000-000000000003', 'Twitch talent');

INSERT INTO "public"."twitch_users" ("id", "talent_id", "twitch_user_id", "twitch_login_name")
VALUES
    ('e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', '900000001', 'searchtalent'),
    ('e3000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', '900000002', NULL);

INSERT INTO "public"."videos" ("id", "talent_id", "title", "duration", "published_at", "platform", "status", "video_kind")
VALUES
    -- An archive, linked to by its ID
    ('e1000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000003', '配信 アーカイブ', 'PT1H', '2026-11-10T12:00:00Z', 'twitch', 'ENDED', 'standard'),
    -- An archive that is not ready yet, linked to the channel of its user
    ('e1000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000003', '配信 アーカイブ準備中', 'PT1H', '2026-11-11T12:00:00Z', 'twitch', 'ENDED', 'standard'),
    -- An archive that is not ready yet, by a user without the login name
    ('e1000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000003', '配信 リンクなし', 'PT1H', '2026-11-14T12:00:00Z', 'twitch', 'ENDED', 'standard'),
    -- A video on YouTube with only a Twitch video
    ('e1000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000003', '配信 プラットフォーム違い', 'PT1H', '2026-11-14T13:00:00Z', 'youtube', 'ENDED', 'standard');

INSERT INTO "public"."twitch_videos" ("video_id", "twitch_video_id", "type", "twitch_user_id")
VALUES
    ('e1000000-0000-0000-0000-000000000011', '900000011', 'archive', 'e3000000-0000-0000-0000-000000000002'),
    ('e1000000-0000-0000-0000-000000000012', 'live:900000012', NULL, 'e3000000-0000-0000-0000-000000000001'),
    ('e1000000-0000-0000-0000-000000000013', 'live:900000013', NULL, 'e3000000-0000-0000-0000-000000000002'),
    ('e1000000-0000-0000-0000-000000000014', '900000014', 'archive', 'e3000000-0000-0000-0000-000000000001');

-- Search as the public site does, so the row-level security applies.
SET LOCAL ROLE "anon";
SELECT set_config('request.jwt.claims', '{"role": "anon"}', true);

-- ---------------------------------------------------------------------------
-- search_videos_v3
-- ---------------------------------------------------------------------------
SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[], 10)$$,
    $$VALUES
        ('e1000000-0000-0000-0000-000000000004'::uuid),
        ('e1000000-0000-0000-0000-000000000003'::uuid),
        ('e1000000-0000-0000-0000-000000000002'::uuid),
        ('e1000000-0000-0000-0000-000000000001'::uuid)$$,
    'without kinds, videos of every kind are returned newest first'
);

SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[], 10, ARRAY['short']::"public"."video_kind"[])$$,
    $$VALUES ('e1000000-0000-0000-0000-000000000002'::uuid)$$,
    'only shorts are returned for the short kind'
);

SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-11-13T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[], 2, ARRAY['standard']::"public"."video_kind"[])$$,
    $$VALUES
        ('e1000000-0000-0000-0000-000000000003'::uuid),
        ('e1000000-0000-0000-0000-000000000001'::uuid)$$,
    'the kinds are filtered before the page size is applied'
);

SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('歌', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[], 10, ARRAY['standard']::"public"."video_kind"[])$$,
    $$VALUES
        ('e1000000-0000-0000-0000-000000000004'::uuid),
        ('e1000000-0000-0000-0000-000000000001'::uuid)$$,
    'the query and the kinds are combined'
);

SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-11-12T12:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[], 10, ARRAY['standard']::"public"."video_kind"[])$$,
    $$VALUES ('e1000000-0000-0000-0000-000000000001'::uuid)$$,
    'only videos published before until are returned'
);

SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002']::uuid[], 10)$$,
    $$VALUES
        ('e1000000-0000-0000-0000-000000000004'::uuid),
        ('e1000000-0000-0000-0000-000000000003'::uuid),
        ('e1000000-0000-0000-0000-000000000002'::uuid),
        ('e1000000-0000-0000-0000-000000000001'::uuid)$$,
    'the videos of a deleted talent and the videos with neither a YouTube nor a Twitch video are not returned'
);

SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002']::uuid[], 2)$$,
    $$VALUES
        ('e1000000-0000-0000-0000-000000000004'::uuid),
        ('e1000000-0000-0000-0000-000000000003'::uuid)$$,
    'the videos the site does not show are left out before the page size is applied'
);

SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000003']::uuid[], 1)$$,
    $$VALUES ('e1000000-0000-0000-0000-000000000012'::uuid)$$,
    'the videos the site cannot link to are left out before the page size is applied'
);

SELECT results_eq(
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000003']::uuid[], 10)$$,
    $$VALUES
        ('e1000000-0000-0000-0000-000000000012'::uuid),
        ('e1000000-0000-0000-0000-000000000011'::uuid)$$,
    'only the videos the site can link to are returned'
);

-- The pages and the count agree
SELECT is(
    (SELECT count(*) FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002']::uuid[], 1000)),
    "public"."count_videos_v1"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002']::uuid[]),
    'the search returns as many videos as count_videos_v1 counts'
);

-- ---------------------------------------------------------------------------
-- count_videos_v1
-- ---------------------------------------------------------------------------
SELECT is(
    "public"."count_videos_v1"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[]),
    4::bigint,
    'without kinds, videos of every kind are counted'
);

SELECT is(
    "public"."count_videos_v1"('歌', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[]),
    3::bigint,
    'only the videos matching the query are counted'
);

SELECT is(
    "public"."count_videos_v1"('歌', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[], ARRAY['short']::"public"."video_kind"[]),
    1::bigint,
    'only the videos of the given kinds are counted'
);

SELECT is(
    "public"."count_videos_v1"('歌', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000002']::uuid[]),
    0::bigint,
    'the videos of a deleted talent are not counted'
);

SELECT is(
    "public"."count_videos_v1"('動画なし', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[]),
    0::bigint,
    'the videos with neither a YouTube nor a Twitch video are not counted'
);

SELECT is(
    "public"."count_videos_v1"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000003']::uuid[]),
    2::bigint,
    'the videos the site cannot link to are not counted'
);

SELECT is(
    (SELECT count(*) FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000003']::uuid[], 1000)),
    "public"."count_videos_v1"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000003']::uuid[]),
    'the search returns as many videos on Twitch as count_videos_v1 counts'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
