export type VideoPlatform = 'youtube' | 'twitch'

export type VideoStatus = 'UPCOMING' | 'LIVE' | 'ENDED' | 'PUBLISHED'

export type TwitchVideoType = 'archive' | 'highlight' | 'upload' | 'clip'

export interface GetVideoExternalUrlParams {
  platform: VideoPlatform
  /**
   * When LIVE (or UPCOMING) on Twitch, prefer the channel top page so users
   * join the live player instead of a VOD that restarts from the beginning.
   */
  status?: VideoStatus | null | undefined
  youtubeVideoId?: string | null | undefined
  twitchVideoId?: string | null | undefined
  twitchVideoType?: TwitchVideoType | null | undefined
  twitchLoginName?: string | null | undefined
}

/**
 * Builds the external watch URL for a video on its source platform.
 *
 * Twitch rules:
 * - LIVE / UPCOMING → `https://www.twitch.tv/<login>` (channel top)
 * - clip → `https://clips.twitch.tv/<id>`
 * - otherwise → `https://www.twitch.tv/videos/<id>`
 *
 * YouTube: `https://www.youtube.com/watch?v=<id>`
 */
export function getVideoExternalUrl(
  params: GetVideoExternalUrlParams,
): string | null {
  if (params.platform === 'youtube') {
    if (!params.youtubeVideoId) {
      return null
    }

    return `https://www.youtube.com/watch?v=${encodeURIComponent(
      params.youtubeVideoId,
    )}`
  }

  const isLiveOrUpcoming =
    params.status === 'LIVE' || params.status === 'UPCOMING'

  if (isLiveOrUpcoming && params.twitchLoginName) {
    return `https://www.twitch.tv/${encodeURIComponent(params.twitchLoginName)}`
  }

  if (params.twitchVideoType === 'clip' && params.twitchVideoId) {
    return `https://clips.twitch.tv/${encodeURIComponent(params.twitchVideoId)}`
  }

  if (params.twitchVideoId) {
    return `https://www.twitch.tv/videos/${encodeURIComponent(
      params.twitchVideoId,
    )}`
  }

  // Last resort: channel page when we only have a login name
  if (params.twitchLoginName) {
    return `https://www.twitch.tv/${encodeURIComponent(params.twitchLoginName)}`
  }

  return null
}
