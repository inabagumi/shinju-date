-- Persist Helix stream id on twitch_videos for LIVE → archive reconciliation.
--
-- While a broadcast is live (or recently ended before the archive VOD appears),
-- batch stores a synthetic twitch_video_id of the form `live:{stream_id}` and
-- sets stream_id. When Helix Get Videos returns an archive with the same
-- stream_id, the row is updated in place (real VOD id + type archive + ENDED).

ALTER TABLE "public"."twitch_videos"
    ADD COLUMN "stream_id" "text";

COMMENT ON COLUMN "public"."twitch_videos"."stream_id" IS
    'Helix stream id (Streams.id / Videos.stream_id). Used to link LIVE placeholders to archive VODs. Null for clips/uploads without a stream.';

-- One row per stream; partial unique so multiple nulls are allowed.
CREATE UNIQUE INDEX "idx_twitch_videos_stream_id"
    ON "public"."twitch_videos" ("stream_id")
    WHERE "stream_id" IS NOT NULL;
