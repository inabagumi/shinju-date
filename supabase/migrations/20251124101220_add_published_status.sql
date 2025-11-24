-- Add PUBLISHED status to video_status enum
-- This status is used for regular published videos that are not live streams or premieres.
--
-- Status meanings:
-- - PUBLISHED: Regular published videos (not live streams or premieres)
-- - UPCOMING: Scheduled live streams or premieres that haven't started yet
-- - LIVE: Currently live streaming
-- - ENDED: Live streams that have finished (includes completed premieres)
--
-- Note on YouTube Premieres (プレミア公開):
-- YouTube premieres are videos scheduled for future release. They appear as UPCOMING
-- until the premiere time, then become ENDED after completion (since they have
-- liveStreamingDetails). This is correct behavior as premieres are treated like
-- live streams in YouTube's API.

-- Add the new PUBLISHED value to the video_status enum
ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'PUBLISHED';

-- Note: Existing videos will keep their current status.
-- The getVideoStatus function will automatically assign PUBLISHED status to new
-- videos that don't have liveStreamingDetails.
-- 
-- For existing data migration (optional), you would need to:
-- 1. Identify videos that are truly published videos (not ended live streams)
-- 2. Update their status from ENDED to PUBLISHED
-- This requires careful analysis of YouTube video metadata to distinguish between
-- ended live streams and regular published videos, which is not trivial.
-- 
-- Going forward, all newly synced videos will automatically get the correct status.
