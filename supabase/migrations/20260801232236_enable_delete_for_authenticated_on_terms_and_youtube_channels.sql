-- Allow authenticated users (admins) to delete terms and youtube_channels.
-- Without these policies, admin hard-delete actions fail with:
--   new row violates row-level security policy (42501)
-- or PostgREST returns 0 rows / permission errors on DELETE.

CREATE POLICY "Enable delete for authenticated users only"
    ON "public"."terms"
    FOR DELETE
    TO "authenticated"
    USING (true);

CREATE POLICY "Enable delete for authenticated users"
    ON "public"."youtube_channels"
    FOR DELETE
    TO "authenticated"
    USING (true);
