-- Tests for the search suggestions (#6771). Run with `supabase test db`.
BEGIN;

SELECT plan(9);

-- Start from no terms so the seed data does not affect the suggestions.
DELETE FROM "public"."terms";

INSERT INTO "public"."terms" ("term", "readings", "synonyms", "popularity")
VALUES
    ('マインクラフト', ARRAY['まいんくらふと'], ARRAY['マイクラ', 'Minecraft'], 0),
    ('歌枠', ARRAY['うたわく'], ARRAY['歌配信', 'カラオケ配信'], 0),
    ('配信', ARRAY['はいしん'], ARRAY['ライブ'], 0),
    ('ライブ配信', ARRAY['らいぶはいしん'], ARRAY[]::text[], 0),
    ('らいおん', ARRAY['らいおん'], ARRAY[]::text[], 0);

-- ---------------------------------------------------------------------------
-- Synonyms
-- ---------------------------------------------------------------------------
SELECT results_eq(
    $$SELECT "term", "priority" FROM "public"."suggestions_v2"('まいく')$$,
    $$VALUES ('マインクラフト'::text, 3)$$,
    'a synonym matching the query in hiragana suggests its term'
);

SELECT results_eq(
    $$SELECT "term", "priority" FROM "public"."suggestions_v2"('maiku')$$,
    $$VALUES ('マインクラフト'::text, 3)$$,
    'a synonym matching the query in romaji suggests its term'
);

SELECT results_eq(
    $$SELECT "term", "priority" FROM "public"."suggestions_v2"('mine')$$,
    $$VALUES ('マインクラフト'::text, 3)$$,
    'a synonym in Latin letters matching the query suggests its term'
);

SELECT results_eq(
    $$SELECT "term", "priority" FROM "public"."suggestions_v2"('歌配')$$,
    $$VALUES ('歌枠'::text, 3)$$,
    'a synonym in kanji matching the query suggests its term'
);

-- ---------------------------------------------------------------------------
-- Order: term matches, then reading matches, then synonym matches
-- ---------------------------------------------------------------------------
SELECT results_eq(
    $$SELECT "term", "priority" FROM "public"."suggestions_v2"('らい')$$,
    $$VALUES ('らいおん'::text, 1), ('ライブ配信'::text, 1), ('配信'::text, 3)$$,
    'synonym matches come after term matches'
);

SELECT results_eq(
    $$SELECT "term", "priority" FROM "public"."suggestions_v2"('まい')$$,
    $$VALUES ('マインクラフト'::text, 1)$$,
    'a term matching both its term and its synonyms is suggested once with the best priority'
);

SELECT results_eq(
    $$SELECT "term", "priority" FROM "public"."suggestions_v2"('うた')$$,
    $$VALUES ('歌枠'::text, 2)$$,
    'reading matches keep their priority'
);

SELECT results_eq(
    $$SELECT "term", "priority" FROM "public"."suggestions_v2"('歌')$$,
    $$VALUES ('歌枠'::text, 1)$$,
    'term matches keep their priority'
);

SELECT is_empty(
    $$SELECT * FROM "public"."suggestions_v2"('zzzzzzzzqqq')$$,
    'nothing is suggested when no term, reading or synonym matches'
);

SELECT * FROM finish();
ROLLBACK;
