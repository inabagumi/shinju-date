-- Tests for updating the popularity of the terms (#6934). Run with
-- `supabase test db`.
BEGIN;

SELECT plan(10);

-- Start from no terms so the seed data does not affect the counts.
DELETE FROM "public"."terms";

INSERT INTO "public"."terms" ("id", "term", "readings", "synonyms", "popularity", "updated_at")
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Minecraft', ARRAY['まいんくらふと'], ARRAY['マイクラ'], 0, '2024-01-01T00:00:00Z'),
    ('f0000000-0000-0000-0000-000000000002', '歌枠', ARRAY['うたわく'], ARRAY['歌配信'], 7, '2024-01-01T00:00:00Z'),
    ('f0000000-0000-0000-0000-000000000003', '配信', ARRAY['はいしん'], ARRAY[]::text[], 3, '2024-01-01T00:00:00Z');

SELECT function_returns(
    'public', 'update_terms_popularity', ARRAY['jsonb'], 'integer',
    'update_terms_popularity(jsonb) returns integer'
);

-- ---------------------------------------------------------------------------
-- Updating
-- ---------------------------------------------------------------------------
SELECT is(
    "public"."update_terms_popularity"(
        '[{"term": "minecraft", "score": 10}, {"term": "歌枠", "score": 5}, {"term": "unknown", "score": 1}]'::jsonb
    ),
    2,
    'returns the number of terms updated, not counting the items that match no term'
);

SELECT results_eq(
    $$SELECT "term", "popularity" FROM "public"."terms" ORDER BY "id"$$,
    $$VALUES ('Minecraft'::text, 10), ('歌枠'::text, 5), ('配信'::text, 3)$$,
    'sets the popularity of the matching terms, ignoring the case, and leaves the others'
);

SELECT results_eq(
    $$SELECT "term", "readings", "synonyms" FROM "public"."terms" ORDER BY "id"$$,
    $$VALUES
        ('Minecraft'::text, ARRAY['まいんくらふと'], ARRAY['マイクラ']),
        ('歌枠'::text, ARRAY['うたわく'], ARRAY['歌配信']),
        ('配信'::text, ARRAY['はいしん'], ARRAY[]::text[])$$,
    'does not change the columns other than popularity'
);

SELECT is(
    "public"."update_terms_popularity"(
        '[{"term": "配信", "score": 4}, {"term": "配信", "score": 9}, {"term": "歌枠"}, {"score": 2}]'::jsonb
    ),
    1,
    'ignores the items without a term or a score'
);

SELECT results_eq(
    $$SELECT "term", "popularity" FROM "public"."terms" ORDER BY "id"$$,
    $$VALUES ('Minecraft'::text, 10), ('歌枠'::text, 5), ('配信'::text, 9)$$,
    'uses the highest score when several items match the same term'
);

SELECT is(
    "public"."update_terms_popularity"('[]'::jsonb),
    0,
    'updates nothing for no items'
);

-- ---------------------------------------------------------------------------
-- More terms than max_rows (1,000)
-- ---------------------------------------------------------------------------
INSERT INTO "public"."terms" ("term", "readings", "synonyms")
SELECT 'term-' || "n", ARRAY['reading-' || "n"], ARRAY[]::text[]
FROM generate_series(1, 1202) AS "n";

SELECT is(
    "public"."update_terms_popularity"(
        (
            SELECT jsonb_agg(jsonb_build_object('term', 'TERM-' || "n", 'score', "n"))
            FROM generate_series(1, 1202) AS "n"
        )
    ),
    1202,
    'updates every term, even more than the rows a request can read'
);

SELECT is(
    (
        SELECT count(*)::integer
        FROM "public"."terms"
        WHERE "term" LIKE 'term-%'
            AND "popularity" = substring("term" FROM 6)::integer
    ),
    1202,
    'sets the score of each of them'
);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
SELECT ok(
    NOT has_function_privilege('anon', 'public.update_terms_popularity(jsonb)', 'EXECUTE')
        AND NOT has_function_privilege('authenticated', 'public.update_terms_popularity(jsonb)', 'EXECUTE')
        AND has_function_privilege('service_role', 'public.update_terms_popularity(jsonb)', 'EXECUTE'),
    'only the service role may run update_terms_popularity'
);

SELECT * FROM finish();
ROLLBACK;
