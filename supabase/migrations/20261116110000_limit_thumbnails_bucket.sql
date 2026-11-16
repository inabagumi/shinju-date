-- Size limit and allowed MIME types for the `thumbnails` bucket (#7147)
--
-- The bucket was created without a size limit or MIME type restriction
-- (20261116100000_add_thumbnails_bucket.sql). The values below are based on
-- the thumbnails stored in production (2026-11-16):
--
--   - file_size_limit: the largest object is about 473 KiB, so 1 MiB leaves
--     about twice the headroom. Same as the `profile-images` bucket.
--   - allowed_mime_types: JPEG and PNG are stored today. WebP is also allowed
--     so thumbnails are not lost if a platform starts serving WebP. Anything
--     else (SVG, ...) is rejected.
--
-- The limits are only checked on upload, so existing objects are not
-- affected. When an upload is rejected, the callers of createThumbnail()
-- report the error and save the video without a thumbnail.
--
-- The previous migration uses ON CONFLICT DO NOTHING and keeps the production
-- bucket as it is, so the limits are set with UPDATE.
UPDATE "storage"."buckets"
SET
    "file_size_limit" = 1048576,
    "allowed_mime_types" = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE "id" = 'thumbnails';
