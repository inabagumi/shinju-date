-- Set `video_kind` of the videos saved so far by the kinds of #7456 (#7457).
-- Deleted videos are updated too, so that they have the right kind when they
-- are restored.
--
-- - YouTube: the videos whose `status` is `UPCOMING`, `LIVE` or `ENDED` are
--   streams. Uploaded videos are `PUBLISHED`.
-- - Twitch: `archive` (`twitch_videos.type`) and `NULL` (a row saved while
--   the stream was live) are streams, and `clip` is a short. `highlight` and
--   `upload` stay `standard`.
--
-- The trigger that sets `updated_at` is disabled meanwhile, so that the kinds
-- given here do not move `updated_at` of every stream to the same time: the
-- admin lists the videos by `updated_at` by default.

ALTER TABLE "public"."videos" DISABLE TRIGGER "on_videos_update";

UPDATE "public"."videos"
SET "video_kind" = 'stream'
WHERE "platform" = 'youtube'
    AND "status" IN ('UPCOMING', 'LIVE', 'ENDED')
    AND "video_kind" <> 'stream';

UPDATE "public"."videos" AS "v"
SET "video_kind" = 'stream'
FROM "public"."twitch_videos" AS "tv"
WHERE "tv"."video_id" = "v"."id"
    AND "v"."platform" = 'twitch'
    AND ("tv"."type" = 'archive' OR "tv"."type" IS NULL)
    AND "v"."video_kind" <> 'stream';

UPDATE "public"."videos" AS "v"
SET "video_kind" = 'short'
FROM "public"."twitch_videos" AS "tv"
WHERE "tv"."video_id" = "v"."id"
    AND "v"."platform" = 'twitch'
    AND "tv"."type" = 'clip'
    AND "v"."video_kind" <> 'short';

ALTER TABLE "public"."videos" ENABLE TRIGGER "on_videos_update";
