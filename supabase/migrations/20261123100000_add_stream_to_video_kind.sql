-- Add `stream` to `video_kind` for streams (#7457): scheduled, live and
-- archived streams, which were `standard` until now, so that the lists can
-- tell them from uploaded videos.
--
-- A value added by `ALTER TYPE ... ADD VALUE` cannot be used until the
-- transaction that added it commits, so the videos saved so far are updated
-- by the next migration (`20261123110000_set_video_kind_of_streams.sql`).
ALTER TYPE "public"."video_kind" ADD VALUE IF NOT EXISTS 'stream';
