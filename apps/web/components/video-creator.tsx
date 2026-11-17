import { twMerge } from '@shinju-date/ui'
import type { ProfileImage, Video } from '@/lib/fetchers'
import Avatar from './avatar'

export interface VideoCreatorInfo {
  name: string
  profileImage: ProfileImage | null
}

function findFirstNonBlank(
  ...values: (string | null | undefined)[]
): string | null {
  for (const value of values) {
    const trimmed = value?.trim()

    if (trimmed) {
      return trimmed
    }
  }

  return null
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
      video.talent?.name,
    )

    return name
      ? { name, profileImage: twitchUser?.profile_image ?? null }
      : null
  }

  const youtubeChannel = video.youtube_video?.youtube_channel
  const name = findFirstNonBlank(
    youtubeChannel?.name,
    youtubeChannel?.youtube_handle,
    video.talent?.name,
  )

  return name
    ? { name, profileImage: youtubeChannel?.profile_image ?? null }
    : null
}

interface VideoCreatorProps {
  className?: string
  value: Video
}

/**
 * Icon and name of the YouTube channel or Twitch user that published the
 * video. It is rendered inside the video card link, so it must not contain
 * links of its own. The text style comes from the surrounding element.
 */
export default function VideoCreator({ className, value }: VideoCreatorProps) {
  const creator = getVideoCreator(value)

  if (!creator) {
    return null
  }

  return (
    <span
      className={twMerge('flex min-w-0 items-center gap-1.5', className)}
      data-testid="video-creator"
    >
      {/*
       * The icon is decorative: the name is always shown next to it, so
       * screen readers do not need to announce it twice.
       */}
      <Avatar
        fallbackTestId="video-creator-default-icon"
        image={creator.profileImage}
        size={20}
      />
      <span className="min-w-0 truncate" title={creator.name}>
        {creator.name}
      </span>
    </span>
  )
}

interface VideoCreatorSkeletonProps {
  className?: string
}

export function VideoCreatorSkeleton({ className }: VideoCreatorSkeletonProps) {
  return (
    <span className={twMerge('flex items-center gap-1.5', className)}>
      <span className="inline-block size-5 shrink-0 animate-pulse rounded-full bg-muted" />
      <span className="inline-block h-3 w-20 animate-pulse rounded-control bg-muted" />
    </span>
  )
}
