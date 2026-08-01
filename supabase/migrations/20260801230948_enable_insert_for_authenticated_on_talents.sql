-- Allow authenticated users (admins) to insert talents
-- Without this policy, createTalentAction fails with:
--   new row violates row-level security policy for table "talents" (42501)
CREATE POLICY "Enable insert for authenticated users only"
    ON "public"."talents"
    FOR INSERT
    TO "authenticated"
    WITH CHECK (true);
