-- Tests for the names of the indexes and the policies (#7121). Run with
-- `supabase test db`.
BEGIN;

SELECT plan(4);

-- ---------------------------------------------------------------------------
-- Indexes: `idx_<table>_<columns>`, with the key columns in order. A partial
-- index may add its condition after them. The indexes of primary keys and
-- unique constraints are named by Postgres and left out.
-- ---------------------------------------------------------------------------
CREATE TEMPORARY TABLE "index_names" ON COMMIT DROP AS
SELECT
    "t"."relname" AS "table_name",
    "i"."relname" AS "index_name",
    'idx_' || "t"."relname" || '_' || (
        SELECT string_agg("a"."attname", '_' ORDER BY "k"."position")
        FROM unnest("x"."indkey"::smallint[]) WITH ORDINALITY AS "k"("attnum", "position")
        JOIN "pg_attribute" AS "a" ON "a"."attrelid" = "t"."oid" AND "a"."attnum" = "k"."attnum"
        WHERE "k"."position" <= "x"."indnkeyatts"
    ) AS "expected_name",
    "x"."indpred" IS NOT NULL AS "is_partial"
FROM "pg_index" AS "x"
JOIN "pg_class" AS "i" ON "i"."oid" = "x"."indexrelid"
JOIN "pg_class" AS "t" ON "t"."oid" = "x"."indrelid"
JOIN "pg_namespace" AS "n" ON "n"."oid" = "t"."relnamespace"
WHERE "n"."nspname" = 'public'
    AND NOT EXISTS (SELECT 1 FROM "pg_constraint" AS "c" WHERE "c"."conindid" = "x"."indexrelid");

SELECT isnt_empty(
    $$SELECT "index_name" FROM "index_names"$$,
    'the public schema has indexes to check'
);

SELECT is_empty(
    $$SELECT "table_name" || '.' || "index_name"
      FROM "index_names"
      WHERE "index_name" <> "expected_name"
        AND NOT ("is_partial" AND starts_with("index_name", "expected_name" || '_'))$$,
    'every index is named idx_<table>_<columns>'
);

-- ---------------------------------------------------------------------------
-- Policies: `<table>: admins can <operation>` for the policies of the admin
-- app (only for `authenticated`, which `admin_role.test.sql` checks for the
-- admin role), and `<table>: anyone can <operation>` for the others.
-- ---------------------------------------------------------------------------
SELECT isnt_empty(
    $$SELECT "policyname" FROM "pg_policies" WHERE "schemaname" = 'public'$$,
    'the public schema has policies to check'
);

SELECT is_empty(
    $$SELECT "tablename" || '.' || "policyname"
      FROM "pg_policies"
      WHERE "schemaname" = 'public'
        AND "policyname" IS DISTINCT FROM
            "tablename" || ': ' ||
            CASE WHEN "roles" = ARRAY['authenticated']::name[] THEN 'admins' ELSE 'anyone' END ||
            ' can ' ||
            CASE "cmd"
                WHEN 'SELECT' THEN 'read'
                WHEN 'INSERT' THEN 'insert'
                WHEN 'UPDATE' THEN 'update'
                WHEN 'DELETE' THEN 'delete'
                WHEN 'ALL' THEN 'manage'
            END$$,
    'every policy is named <table>: admins can <operation> or <table>: anyone can <operation>'
);

SELECT * FROM finish();
ROLLBACK;
