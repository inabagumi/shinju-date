-- Tests for the kinds of videos (#7457). Run with `supabase test db`.
BEGIN;

SELECT plan(2);

SELECT enum_has_labels(
    'public', 'video_kind', ARRAY['standard', 'short', 'stream'],
    'video_kind has standard, short and stream'
);

INSERT INTO "public"."talents" ("id", "name")
VALUES ('e1000000-0000-0000-0000-000000000001', 'Video kind talent');

SELECT lives_ok(
    $$
        INSERT INTO "public"."videos" ("talent_id", "title", "duration", "published_at", "platform", "status", "video_kind")
        VALUES ('e1000000-0000-0000-0000-000000000001', 'Stream', 'PT1H', NOW(), 'youtube', 'ENDED', 'stream')
    $$,
    'a stream is stored'
);

SELECT * FROM finish();
ROLLBACK;
