-- Keep the Twitch logins in `twitch_users` in lowercase (#7107).
--
-- The site finds the Twitch user of a click on `twitch.tv/<login>` by an
-- exact match on the lowercased login. It used `ilike` before, which reads the
-- `_` that logins may contain as a wildcard, so a click could be counted for
-- another user, or not at all when two users matched.
--
-- The Twitch API returns logins in lowercase, and the admin and the scraper
-- store them as returned. Lowercase any row that is not, then keep them so.
-- Logins may still be NULL.

UPDATE "public"."twitch_users"
SET "twitch_login_name" = lower("twitch_login_name")
WHERE "twitch_login_name" <> lower("twitch_login_name");

ALTER TABLE "public"."twitch_users"
    ADD CONSTRAINT "twitch_users_twitch_login_name_lowercase"
    CHECK ("twitch_login_name" = lower("twitch_login_name"));
