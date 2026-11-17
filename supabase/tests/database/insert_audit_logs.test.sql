-- Tests for recording several audit log entries with one call (#7015).
-- Run with `supabase test db`.
BEGIN;

SELECT plan(10);

SELECT has_function(
    'public',
    'insert_audit_logs',
    ARRAY['jsonb'],
    'insert_audit_logs(jsonb) exists'
);

-- ---------------------------------------------------------------------------
-- Fixtures: an admin and a signed-in user without the admin role.
-- ---------------------------------------------------------------------------
INSERT INTO "auth"."users" ("id", "email", "raw_app_meta_data")
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'audit-admin@example.test', '{"provider": "email", "role": "admin"}'),
    ('f0000000-0000-0000-0000-000000000002', 'audit-member@example.test', '{"provider": "email"}');

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "anon";
SELECT set_config('request.jwt.claims', '{"role": "anon"}', true);

SELECT throws_ok(
    $$SELECT "public"."insert_audit_logs"('[{"action": "VIDEO_DELETE", "target_table": "videos"}]')$$,
    '42501',
    NULL,
    'anon cannot write audit logs'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- A signed-in user without the admin role
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "f0000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);

SELECT throws_ok(
    $$SELECT "public"."insert_audit_logs"('[{"action": "VIDEO_DELETE", "target_table": "videos"}]')$$,
    '42501',
    'permission denied for function insert_audit_logs',
    'a user without the admin role cannot write audit logs'
);

RESET ROLE;

SELECT is_empty(
    $$SELECT "id" FROM "public"."audit_logs" WHERE "user_id" = 'f0000000-0000-0000-0000-000000000002'$$,
    'nothing is recorded for a user without the admin role'
);

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "authenticated";
SELECT set_config('request.jwt.claims', '{"sub": "f0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);

SELECT lives_ok(
    $$SELECT "public"."insert_audit_logs"('[
        {"action": "VIDEO_DELETE", "target_table": "videos", "target_record_id": "f1000000-0000-0000-0000-000000000001", "details": {"entityName": "Video 1"}},
        {"action": "VIDEO_DELETE", "target_table": "videos", "target_record_id": "f1000000-0000-0000-0000-000000000002", "details": {"entityName": "Video 2"}},
        {"action": "MAINTENANCE_MODE_ENABLE", "target_table": "redis:system", "target_record_id": null, "details": null}
    ]')$$,
    'an admin can write several audit logs with one call'
);

SELECT lives_ok(
    $$SELECT "public"."insert_audit_logs"('[]')$$,
    'an empty array records nothing and does not fail'
);

SELECT throws_ok(
    $$SELECT "public"."insert_audit_logs"('{"action": "VIDEO_DELETE", "target_table": "videos"}')$$,
    '22023',
    NULL,
    'an object that is not an array is rejected'
);

SELECT throws_ok(
    $$SELECT "public"."insert_audit_logs"('[{"action": "NOT_AN_ACTION", "target_table": "videos"}]')$$,
    '22P02',
    NULL,
    'an unknown action is rejected'
);

RESET ROLE;

SELECT results_eq(
    $$SELECT "user_id", "action"::text, "target_table", "target_record_id", "details"
      FROM "public"."audit_logs"
      WHERE "user_id" = 'f0000000-0000-0000-0000-000000000001'
      ORDER BY "target_record_id" NULLS LAST$$,
    $$VALUES
        ('f0000000-0000-0000-0000-000000000001'::"uuid", 'VIDEO_DELETE', 'videos', 'f1000000-0000-0000-0000-000000000001'::"uuid", '{"entityName": "Video 1"}'::"jsonb"),
        ('f0000000-0000-0000-0000-000000000001'::"uuid", 'VIDEO_DELETE', 'videos', 'f1000000-0000-0000-0000-000000000002'::"uuid", '{"entityName": "Video 2"}'::"jsonb"),
        ('f0000000-0000-0000-0000-000000000001'::"uuid", 'MAINTENANCE_MODE_ENABLE', 'redis:system', NULL::"uuid", NULL::"jsonb")$$,
    'every entry is recorded with the action, the target, the details and the admin who called it'
);

-- ---------------------------------------------------------------------------
-- The service role keeps access.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE "service_role";
SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);

SELECT lives_ok(
    $$SELECT "public"."insert_audit_logs"('[{"action": "MAINTENANCE_MODE_DISABLE", "target_table": "redis:system"}]')$$,
    'the service role can write audit logs'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
