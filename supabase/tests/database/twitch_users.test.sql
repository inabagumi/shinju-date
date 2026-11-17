-- Tests for the Twitch logins in twitch_users (#7107). Run with `supabase test db`.
BEGIN;

SELECT plan(4);

SELECT col_is_null('public', 'twitch_users', 'twitch_login_name', 'a Twitch user may have no login');

INSERT INTO "public"."talents" ("id", "name")
VALUES ('e1000000-0000-0000-0000-000000000001', 'Twitch talent');

SELECT lives_ok(
    $$
        INSERT INTO "public"."twitch_users" ("talent_id", "twitch_user_id", "twitch_login_name")
        VALUES
            ('e1000000-0000-0000-0000-000000000001', '910001', 'foo_bar'),
            ('e1000000-0000-0000-0000-000000000001', '910002', NULL)
    $$,
    'a lowercase login and no login are stored'
);

SELECT throws_ok(
    $$
        INSERT INTO "public"."twitch_users" ("talent_id", "twitch_user_id", "twitch_login_name")
        VALUES ('e1000000-0000-0000-0000-000000000001', '910003', 'Foo_Bar')
    $$,
    '23514',
    NULL,
    'a login with uppercase letters is rejected'
);

SELECT throws_ok(
    $$
        UPDATE "public"."twitch_users"
        SET "twitch_login_name" = 'FOO_BAR'
        WHERE "twitch_user_id" = '910001'
    $$,
    '23514',
    NULL,
    'a login cannot be changed to one with uppercase letters'
);

SELECT * FROM finish();
ROLLBACK;
