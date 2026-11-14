import { UserRound } from 'lucide-react'
import Image from 'next/image'
import { twMerge } from 'tailwind-merge'
import type { ProfileImage, Video } from '@/lib/fetchers'

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

interface CreatorIconProps {
  className?: string
  profileImage: ProfileImage | null
}

/**
 * The icon is decorative: the name is always shown next to it, so screen
 * readers do not need to announce it twice.
 */
function CreatorIcon({ className, profileImage }: CreatorIconProps) {
  const baseClassName =
    'relative size-6 shrink-0 overflow-hidden rounded-full bg-774-nevy-200 dark:bg-zinc-700'

  if (!profileImage) {
    return (
      <span
        aria-hidden="true"
        className={twMerge(
          baseClassName,
          'flex items-center justify-center text-774-nevy-500 dark:text-zinc-400',
          className,
        )}
        data-testid="video-creator-default-icon"
      >
        <UserRound className="size-[70%]" strokeWidth={1.5} />
      </span>
    )
  }

  return (
    <span className={twMerge(baseClassName, className)}>
      <Image
        alt=""
        blurDataURL={profileImage.blur_data_url}
        className="object-cover"
        fill
        placeholder={profileImage.blur_data_url ? 'blur' : 'empty'}
        sizes="24px"
        src={`/images/profile-images/${profileImage.id}`}
      />
    </span>
  )
}

interface VideoCreatorProps {
  className?: string
  compact?: boolean
  value: Video
}

/**
 * Icon and name of the YouTube channel or Twitch user that published the
 * video. It is rendered inside the video card link, so it must not contain
 * links of its own.
 */
export default function VideoCreator({
  className,
  compact = false,
  value,
}: VideoCreatorProps) {
  const creator = getVideoCreator(value)

  if (!creator) {
    return null
  }

  return (
    <p
      className={twMerge(
        'flex min-w-0 items-center gap-2 text-sm text-774-nevy-700 dark:text-zinc-300',
        compact && 'gap-1.5 text-xs',
        className,
      )}
      data-testid="video-creator"
    >
      <CreatorIcon
        className={twMerge(compact && 'size-5')}
        profileImage={creator.profileImage}
      />
      <span className="min-w-0 truncate" title={creator.name}>
        {creator.name}
      </span>
    </p>
  )
}

interface VideoCreatorSkeletonProps {
  className?: string
  compact?: boolean
}

export function VideoCreatorSkeleton({
  className,
  compact = false,
}: VideoCreatorSkeletonProps) {
  return (
    <div
      className={twMerge(
        'flex items-center gap-2',
        compact && 'gap-1.5',
        className,
      )}
    >
      <span
        className={twMerge(
          'inline-block size-6 shrink-0 animate-pulse rounded-full bg-774-nevy-200 dark:bg-zinc-700',
          compact && 'size-5',
        )}
      />
      <span className="inline-block h-3 w-24 animate-pulse rounded-md bg-774-nevy-200 dark:bg-zinc-700" />
    </div>
  )
}
