/**
 * Prefix for synthetic `twitch_videos.twitch_video_id` values while a stream is
 * live (or recently ended) and the archive VOD id is not yet known.
 * Helix video IDs are numeric; this prefix avoids collisions.
 */
export const LIVE_TWITCH_VIDEO_ID_PREFIX = "live:" as const;

/**
 * Builds a stable synthetic platform id for a live (or pending-archive) stream.
 */
export const toLiveTwitchVideoId = (streamId: string): string =>
  `${LIVE_TWITCH_VIDEO_ID_PREFIX}${streamId}`;

/**
 * Returns true when `twitch_video_id` is a synthetic live placeholder.
 */
export const isLiveTwitchVideoId = (twitchVideoId: string): boolean =>
  twitchVideoId.startsWith(LIVE_TWITCH_VIDEO_ID_PREFIX);

/**
 * Extracts the Helix stream id from a synthetic live video id, or null.
 */
export const streamIdFromLiveTwitchVideoId = (
  twitchVideoId: string
): string | null => {
  if (!isLiveTwitchVideoId(twitchVideoId)) {
    return null;
  }
  return twitchVideoId.slice(LIVE_TWITCH_VIDEO_ID_PREFIX.length);
};
