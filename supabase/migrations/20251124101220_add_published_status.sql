-- Add PUBLISHED status to video_status enum
-- This status is used for regular published videos that are not live streams

-- Add the new PUBLISHED value to the video_status enum
ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'PUBLISHED';

-- Note: Existing videos will keep their current status.
-- To migrate existing data, you may want to run an UPDATE query
-- to set status = 'PUBLISHED' for videos that are not live streams.
-- Example (DO NOT run automatically, review data first):
-- UPDATE videos 
-- SET status = 'PUBLISHED' 
-- WHERE status = 'ENDED' 
--   AND id NOT IN (
--     SELECT video_id 
--     FROM youtube_videos yv
--     JOIN videos v ON v.id = yv.video_id
--     -- Add additional criteria to identify actual live streams
--   );
