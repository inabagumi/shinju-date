import type { ProfileImage, Video } from '@/lib/fetchers'
import { findFirstNonBlank } from '@/lib/talent-links'

export interface VideoCreatorInfo {
  name: string
  profileImage: ProfileImage | null
}

/**
 * Resolves who published a video: the YouTube channel or Twitch user the
 * video belongs to.
 *
 * - YouTube: channel name, then handle
 * - Twitch: display name, then login
 *
 * When the platform account is missing or has no name, the talent name is
 * used instead, so related data being absent never hides the card.
 */
export function getVideoCreator(video: Video): VideoCreatorInfo | null {
  if (video.platform === 'twitch') {
    const twitchUser = video.twitch_video?.twitch_user
    const name = findFirstNonBlank(
      twitchUser?.name,
      twitchUser?.twitch_login_name,
      video.talent.name,
    )

    return name
      ? { name, profileImage: twitchUser?.profile_image ?? null }
      : null
  }

  const youtubeChannel = video.youtube_video?.youtube_channel
  const name = findFirstNonBlank(
    youtubeChannel?.name,
    youtubeChannel?.youtube_handle,
    video.talent.name,
  )

  return name
    ? { name, profileImage: youtubeChannel?.profile_image ?? null }
    : null
}
