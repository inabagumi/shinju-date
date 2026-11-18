-- Tests for leaving `updated_at` to the triggers (#7079). Run with
-- `supabase test db`.
--
-- NOW() is the start of the transaction, so every update below gets the same
-- `updated_at`: date_trunc('second', NOW()).
BEGIN;

SELECT plan(19);

-- ---------------------------------------------------------------------------
-- The trigger of talents
-- ---------------------------------------------------------------------------
SELECT trigger_is(
    'public', 'talents', 'on_talents_update',
    'public', 'handle_updated_at',
    'talents has the trigger that sets updated_at'
);

INSERT INTO "public"."talents" ("id", "name", "created_at", "updated_at")
VALUES
    ('e1000000-0000-0000-0000-000000000001', 'Updated at talent 1', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
    ('e1000000-0000-0000-0000-000000000002', 'Updated at talent 2', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'),
    ('e1000000-0000-0000-0000-000000000003', 'Updated at talent 3', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z');

SELECT is(
    (SELECT "updated_at" FROM "public"."talents" WHERE "id" = 'e1000000-0000-0000-0000-000000000001'),
    '2000-01-01T00:00:00Z'::timestamptz,
    'an insert keeps the given updated_at'
);

UPDATE "public"."talents"
SET "name" = 'Renamed talent 1'
WHERE "id" = 'e1000000-0000-0000-0000-000000000001';

SELECT is(
    (SELECT "updated_at" FROM "public"."talents" WHERE "id" = 'e1000000-0000-0000-0000-000000000001'),
    date_trunc('second', NOW()),
    'updating a talent moves its updated_at to the current time'
);

UPDATE "public"."talents"
SET "updated_at" = '2000-01-02T00:00:00Z'
WHERE "id" = 'e1000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT "updated_at" FROM "public"."talents" WHERE "id" = 'e1000000-0000-0000-0000-000000000002'),
    date_trunc('second', NOW()),
    'an updated_at given on an update is replaced with the current time'
);

-- ---------------------------------------------------------------------------
-- touch_talent and touch_thumbnail
-- ---------------------------------------------------------------------------
SELECT function_returns(
    'public', 'touch_talent', ARRAY['uuid'], 'void',
    'touch_talent(uuid) returns void'
);

SELECT function_returns(
    'public', 'touch_thumbnail', ARRAY['uuid'], 'void',
    'touch_thumbnail(uuid) returns void'
);

INSERT INTO "auth"."users" ("id", "email", "raw_app_meta_data")
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'updated-at-admin@example.test', '{"provider": "email", "role": "admin"}'),
    ('e0000000-0000-0000-0000-000000000002', 'updated-at-member@example.test', '{"provider": "email"}');

INSERT INTO "public"."thumbnails" ("id", "path", "blur_data_url", "width", "height", "created_at", "updated_at")
VALUES ('e2000000-0000-0000-0000-000000000001', 'updated-at/1.jpg', 'data:image/jpeg;base64,', 1280, 720, '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z');

SET LOCAL ROLE "anon";
SELECT set_config('request.jwt.claims', '{"role": "anon"}', true);

SELECT throws_ok(
    $$SELECT "public"."touch_talent"('e1000000-0000-0000-0000-000000000003')$$,
    '42501',
    NULL,
    'anon cannot touch a talent'
);

SELECT throws_ok(
    $$SELECT "public"."touch_thumbnail"('e2000000-0000-0000-0000-000000000001')$$,
    '42501',
    NULL,
    'anon cannot touch a thumbnail'
);

RESET ROLE;

SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);

SELECT throws_ok(
    $$SELECT "public"."touch_talent"('e1000000-0000-0000-0000-000000000003')$$,
    '42501',
    'permission denied for function touch_talent',
    'a user without the admin role cannot touch a talent'
);

SELECT throws_ok(
    $$SELECT "public"."touch_thumbnail"('e2000000-0000-0000-0000-000000000001')$$,
    '42501',
    'permission denied for function touch_thumbnail',
    'a user without the admin role cannot touch a thumbnail'
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "updated_at" FROM "public"."talents" WHERE "id" = 'e1000000-0000-0000-0000-000000000003'
      UNION ALL
      SELECT "updated_at" FROM "public"."thumbnails" WHERE "id" = 'e2000000-0000-0000-0000-000000000001'$$,
    $$VALUES ('2000-01-01T00:00:00Z'::timestamptz), ('2000-01-01T00:00:00Z'::timestamptz)$$,
    'nothing changes when the caller has no permission'
);

-- The admin app touches a talent when one of its accounts changes
SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "e0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);

SELECT lives_ok(
    $$SELECT "public"."touch_talent"('e1000000-0000-0000-0000-000000000003')$$,
    'an admin can touch a talent'
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "name", "created_at", "updated_at" FROM "public"."talents" WHERE "id" = 'e1000000-0000-0000-0000-000000000003'$$,
    $$VALUES ('Updated at talent 3'::text, '2000-01-01T00:00:00Z'::timestamptz, date_trunc('second', NOW()))$$,
    'touch_talent only moves updated_at of the talent'
);

-- The scraper touches a thumbnail when a video stops using it
SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT lives_ok(
    $$SELECT "public"."touch_thumbnail"('e2000000-0000-0000-0000-000000000001')$$,
    'the service role can touch a thumbnail'
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "path", "created_at", "updated_at" FROM "public"."thumbnails" WHERE "id" = 'e2000000-0000-0000-0000-000000000001'$$,
    $$VALUES ('updated-at/1.jpg'::text, '2000-01-01T00:00:00Z'::timestamptz, date_trunc('second', NOW()))$$,
    'touch_thumbnail only moves updated_at of the thumbnail'
);

-- ---------------------------------------------------------------------------
-- The defaults of created_at and updated_at
-- ---------------------------------------------------------------------------
SELECT is_empty(
    $$SELECT "c"."table_name", "c"."column_name", "c"."column_default"
      FROM "information_schema"."columns" AS "c"
      JOIN "information_schema"."tables" AS "t"
        ON "t"."table_schema" = "c"."table_schema" AND "t"."table_name" = "c"."table_name"
      WHERE "c"."table_schema" = 'public'
        AND "t"."table_type" = 'BASE TABLE'
        AND "c"."column_name" IN ('created_at', 'updated_at')
        AND "c"."column_default" IS DISTINCT FROM 'date_trunc(''second''::text, now())'$$,
    'every created_at and updated_at defaults to the current time truncated to the second'
);

INSERT INTO "public"."announcements" ("id", "message", "start_at", "end_at")
VALUES ('e3000000-0000-0000-0000-000000000001', 'Updated at announcement', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z');

SELECT results_eq(
    $$SELECT "created_at", "updated_at" FROM "public"."announcements" WHERE "id" = 'e3000000-0000-0000-0000-000000000001'$$,
    $$VALUES (date_trunc('second', NOW()), date_trunc('second', NOW()))$$,
    'the defaults are the current time truncated to the second'
);

-- ---------------------------------------------------------------------------
-- NOT NULL of announcements
-- ---------------------------------------------------------------------------
SELECT col_not_null('public', 'announcements', 'created_at', 'announcements.created_at is NOT NULL');
SELECT col_not_null('public', 'announcements', 'updated_at', 'announcements.updated_at is NOT NULL');

SELECT * FROM finish();
ROLLBACK;
