-- Tests for restricting admin access to the admin role (#6473).
-- Run with `supabase test db`.
BEGIN;

SELECT plan(26);

-- ---------------------------------------------------------------------------
-- Fixtures: an admin, a signed-in user without the admin role, a banned
-- admin, plus an active talent and a deleted talent.
-- ---------------------------------------------------------------------------
INSERT INTO "auth"."users" ("id", "email", "raw_app_meta_data", "banned_until")
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'admin@example.test', '{"provider": "email", "role": "admin"}', NULL),
    ('d0000000-0000-0000-0000-000000000002', 'member@example.test', '{"provider": "email"}', NULL),
    ('d0000000-0000-0000-0000-000000000003', 'banned@example.test', '{"provider": "email", "role": "admin"}', NOW() + INTERVAL '1 day');

INSERT INTO "public"."talents" ("id", "name", "deleted_at")
VALUES
    ('d1000000-0000-0000-0000-000000000001', 'Active talent', NULL),
    ('d1000000-0000-0000-0000-000000000002', 'Deleted talent', NOW());

-- ---------------------------------------------------------------------------
-- Every policy for `authenticated` checks the admin role, except the public
-- submission of feature requests.
-- ---------------------------------------------------------------------------
SELECT has_function('public', 'is_admin', ARRAY[]::text[], 'is_admin() exists');

SELECT is_empty(
    $$SELECT "tablename" || '.' || "policyname"
      FROM "pg_policies"
      WHERE "schemaname" = 'public'
        AND 'authenticated' = ANY ("roles")
        AND COALESCE("qual", '') || COALESCE("with_check", '') NOT LIKE '%is_admin()%'
        AND NOT ("tablename" = 'feature_requests' AND "policyname" = 'Allow anyone to insert feature requests')$$,
    'every policy for authenticated requires the admin role'
);

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "anon";
SELECT set_config('request.jwt.claims', '{"role": "anon"}', true);

SELECT throws_ok(
    $$SELECT "public"."is_admin"()$$,
    '42501',
    NULL,
    'anon cannot call is_admin()'
);

SELECT throws_ok(
    $$SELECT * FROM "public"."get_audit_logs"()$$,
    '42501',
    NULL,
    'anon cannot read audit logs'
);

SELECT throws_ok(
    $$SELECT "public"."insert_audit_log"('TERM_CREATE', 'terms')$$,
    '42501',
    NULL,
    'anon cannot write audit logs'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- A signed-in user without the admin role is treated like the public.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);

SELECT is("public"."is_admin"(), false, 'a user without the admin role is not an admin');

SELECT results_eq(
    $$SELECT "id" FROM "public"."talents" WHERE "id"::text LIKE 'd1000000-%' ORDER BY "id"$$,
    $$VALUES ('d1000000-0000-0000-0000-000000000001'::"uuid")$$,
    'a user without the admin role cannot read deleted talents'
);

SELECT is_empty(
    $$UPDATE "public"."talents" SET "deleted_at" = NULL WHERE "id" = 'd1000000-0000-0000-0000-000000000002' RETURNING "id"$$,
    'a user without the admin role cannot restore a deleted talent'
);

SELECT is_empty(
    $$UPDATE "public"."talents" SET "name" = 'Renamed' WHERE "id" = 'd1000000-0000-0000-0000-000000000001' RETURNING "id"$$,
    'a user without the admin role cannot update a talent'
);

SELECT throws_ok(
    $$INSERT INTO "public"."talents" ("name") VALUES ('New talent')$$,
    '42501',
    NULL,
    'a user without the admin role cannot create a talent'
);

SELECT throws_ok(
    $$INSERT INTO "public"."terms" ("term", "readings", "synonyms") VALUES ('term', '{}', '{}')$$,
    '42501',
    NULL,
    'a user without the admin role cannot create a term'
);

SELECT is_empty(
    $$SELECT "id" FROM "public"."audit_logs"$$,
    'a user without the admin role cannot read the audit_logs table'
);

SELECT is_empty(
    $$SELECT "id" FROM "public"."feature_requests"$$,
    'a user without the admin role cannot read feature requests'
);

SELECT is_empty(
    $$SELECT "id" FROM "public"."video_backfill_jobs"$$,
    'a user without the admin role cannot read video backfill jobs'
);

SELECT throws_ok(
    $$SELECT * FROM "public"."get_audit_logs"()$$,
    '42501',
    NULL,
    'a user without the admin role cannot read audit logs'
);

SELECT throws_ok(
    $$SELECT "public"."insert_audit_log"('TERM_CREATE', 'terms')$$,
    '42501',
    NULL,
    'a user without the admin role cannot write audit logs'
);

SELECT lives_ok(
    $$INSERT INTO "public"."feature_requests" ("message") VALUES ('Please add a feature')$$,
    'a user without the admin role can still submit a feature request'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- A banned admin loses access while the access token is still valid.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-000000000003", "role": "authenticated"}', true);

SELECT is("public"."is_admin"(), false, 'a banned admin is not an admin');

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "d0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);

SELECT is("public"."is_admin"(), true, 'a user with the admin role is an admin');

SELECT results_eq(
    $$SELECT "id" FROM "public"."talents" WHERE "id"::text LIKE 'd1000000-%' ORDER BY "id"$$,
    $$VALUES ('d1000000-0000-0000-0000-000000000001'::"uuid"), ('d1000000-0000-0000-0000-000000000002'::"uuid")$$,
    'an admin can read deleted talents'
);

SELECT results_eq(
    $$UPDATE "public"."talents" SET "deleted_at" = NULL WHERE "id" = 'd1000000-0000-0000-0000-000000000002' RETURNING "id"$$,
    $$VALUES ('d1000000-0000-0000-0000-000000000002'::"uuid")$$,
    'an admin can restore a deleted talent'
);

SELECT lives_ok(
    $$INSERT INTO "public"."talents" ("name") VALUES ('New talent')$$,
    'an admin can create a talent'
);

SELECT lives_ok(
    $$SELECT "public"."insert_audit_log"('TERM_CREATE', 'terms', 'd1000000-0000-0000-0000-000000000002')$$,
    'an admin can write audit logs'
);

SELECT results_eq(
    $$SELECT "user_email", "target_record_id" FROM "public"."get_audit_logs"() WHERE "target_record_id" = 'd1000000-0000-0000-0000-000000000002'$$,
    $$VALUES ('admin@example.test'::text, 'd1000000-0000-0000-0000-000000000002'::"uuid")$$,
    'an admin can read audit logs'
);

SELECT is(
    (SELECT count(*)::integer FROM "public"."feature_requests" WHERE "message" = 'Please add a feature'),
    1,
    'an admin can read feature requests'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- The service role keeps access to the audit log RPCs.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT lives_ok(
    $$SELECT * FROM "public"."get_audit_logs"()$$,
    'the service role can read audit logs'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
