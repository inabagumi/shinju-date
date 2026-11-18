import { twMerge } from '@shinju-date/ui'
import type { Video } from '@/lib/data/videos'
import { getVideoCreator } from '@/lib/video-creator'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'

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
      <Avatar aria-hidden="true" size={20}>
        {creator.profileImage ? (
          <AvatarImage image={creator.profileImage} sizes="20px" />
        ) : (
          <AvatarFallback data-testid="video-creator-default-icon" />
        )}
      </Avatar>
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
