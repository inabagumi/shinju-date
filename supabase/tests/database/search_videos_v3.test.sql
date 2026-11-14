-- Tests for the video search by kind (#6804). Run with `supabase test db`.
BEGIN;

SELECT plan(8);

-- ---------------------------------------------------------------------------
-- Fixtures: a talent with regular videos and shorts. The searches are limited
-- to this talent so the seed data does not affect the results.
-- ---------------------------------------------------------------------------
INSERT INTO "public"."talents" ("id", "name")
VALUES ('e0000000-0000-0000-0000-000000000001', 'Search talent');

INSERT INTO "public"."videos" ("id", "talent_id", "title", "duration", "published_at", "platform", "status", "video_kind")
VALUES
    ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '歌枠 その1', 'PT1H', '2026-11-10T12:00:00Z', 'youtube', 'ENDED', 'standard'),
    ('e1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', '歌ってみた ショート', 'PT30S', '2026-11-11T12:00:00Z', 'youtube', 'PUBLISHED', 'short'),
    ('e1000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'ゲーム実況', 'PT2H', '2026-11-12T12:00:00Z', 'youtube', 'ENDED', 'standard'),
    ('e1000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', '歌枠 その2', 'PT1H', '2026-11-13T12:00:00Z', 'youtube', 'ENDED', 'standard');

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
    $$SELECT "id" FROM "public"."search_videos_v3"('', '2026-12-01T00:00:00Z', ARRAY['e0000000-0000-0000-0000-000000000001']::uuid[], 2, ARRAY['standard']::"public"."video_kind"[])$$,
    $$VALUES
        ('e1000000-0000-0000-0000-000000000004'::uuid),
        ('e1000000-0000-0000-0000-000000000003'::uuid)$$,
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

SELECT * FROM finish();
ROLLBACK;
