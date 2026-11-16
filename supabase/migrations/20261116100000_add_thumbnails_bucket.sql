-- Storage bucket for video thumbnails (#7133)
--
-- Thumbnails are stored in the `thumbnails` bucket and registered in the
-- `thumbnails` table. The bucket already exists in production, but no
-- migration created it, so a fresh local Supabase had no bucket and every
-- upload failed with "Bucket not found".
--
-- Private: objects are served through the /images/thumbnails/[id] routes of
-- the web and admin apps, which sign URLs with the service role. No
-- storage.objects policies are added, so only the service role can read or
-- write objects.
--
-- No size limit or MIME type restriction: thumbnails are stored as they are
-- served by the platforms (JPEG, WebP, ...), without re-encoding.
--
-- ON CONFLICT DO NOTHING keeps the existing production bucket and its
-- settings as they are.
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('thumbnails', 'thumbnails', false)
ON CONFLICT ("id") DO NOTHING;
