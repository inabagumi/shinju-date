-- Index on videos.thumbnail_id for the cleanup of unused thumbnails (#7063)
--
-- removeUnusedThumbnails() in @shinju-date/scraper lists the thumbnails that
-- no video points at (an anti-join of thumbnails and videos on thumbnail_id),
-- then deletes them. Deleting a thumbnail also makes the database look up the
-- videos that reference it (videos_thumbnail_id_fkey). Without an index, both
-- scan every video.
CREATE INDEX IF NOT EXISTS "idx_videos_thumbnail_id"
    ON "public"."videos" USING "btree" ("thumbnail_id");
