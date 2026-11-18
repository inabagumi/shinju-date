-- Drop `search_videos_v2` (#7369). `search_videos_v3`
-- (`20261114150000_add_search_videos_v3.sql`) kept it until the deployed site
-- stopped calling it. The site has called `search_videos_v3` since then, and
-- nothing else calls `search_videos_v2`.

DROP FUNCTION IF EXISTS "public"."search_videos_v2"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint);
