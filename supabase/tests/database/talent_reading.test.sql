-- Tests for the readings of the talents (#6894). Run with `supabase test db`.
BEGIN;

SELECT plan(4);

SELECT col_is_null('public', 'talents', 'reading', 'a talent may have no reading');
SELECT col_type_is('public', 'talents', 'reading', 'text', 'reading is text');

SELECT is(
    (
        SELECT "c"."collname"::text
        FROM "pg_attribute" AS "a"
        JOIN "pg_collation" AS "c" ON "c"."oid" = "a"."attcollation"
        WHERE "a"."attrelid" = 'public.talents'::regclass
            AND "a"."attname" = 'reading'
    ),
    'ja-x-icu',
    'reading uses the Japanese collation, whatever the default of the database is'
);

-- The order the public list of talents uses: by reading, then talents
-- without a reading by name.
INSERT INTO "public"."talents" ("id", "name", "reading")
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'かい', 'かい'),
    ('e0000000-0000-0000-0000-000000000002', 'かーる', 'かーる'),
    ('e0000000-0000-0000-0000-000000000003', 'かある', 'かある'),
    ('e0000000-0000-0000-0000-000000000004', 'かあ', 'かあ'),
    ('e0000000-0000-0000-0000-000000000005', 'がい', 'がい'),
    ('e0000000-0000-0000-0000-000000000006', 'かんな', 'かんな'),
    ('e0000000-0000-0000-0000-000000000007', 'きやま', 'きやま'),
    ('e0000000-0000-0000-0000-000000000008', 'きゃろる', 'きゃろる'),
    ('e0000000-0000-0000-0000-000000000009', 'Zed', NULL),
    ('e0000000-0000-0000-0000-000000000010', 'Abe', NULL);

SELECT is(
    (
        SELECT array_agg("name" ORDER BY "reading" ASC NULLS LAST, "name" ASC)
        FROM "public"."talents"
        WHERE "id"::text LIKE 'e0000000-%'
    ),
    ARRAY['かあ', 'かーる', 'かある', 'かい', 'がい', 'かんな', 'きやま', 'きゃろる', 'Abe', 'Zed'],
    'talents are sorted by reading in the order of the Japanese syllabary, and those without one by name last'
);

SELECT * FROM finish();
ROLLBACK;
