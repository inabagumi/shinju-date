-- Drop `search_videos_v3` and `count_videos_v1` (#7377). `search_videos_v4`
-- and `count_videos_v2` (`20261118140000_rename_legacy_names.sql`) kept them
-- until the deployed site stopped calling them. The site has called the new
-- functions since then, and nothing else calls the old ones.

DROP FUNCTION IF EXISTS "public"."search_videos_v3"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint, "video_kinds" "public"."video_kind"[]);

DROP FUNCTION IF EXISTS "public"."count_videos_v1"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "video_kinds" "public"."video_kind"[]);
