import type { Tables } from '@shinju-date/database'
import { twMerge } from '@shinju-date/ui'

const PLATFORM_LABELS: Record<Tables<'videos'>['platform'], string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
}

interface PlatformBadgeProps {
  className?: string
  platform: Tables<'videos'>['platform']
}

/**
 * Small platform indicator for video cards.
 * Twitch is emphasized so multi-platform results are easy to scan.
 */
export default function PlatformBadge({
  className,
  platform,
}: PlatformBadgeProps) {
  if (platform === 'youtube') {
    return null
  }

  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-md bg-[#772CE8] px-1.5 py-0.5 text-xs font-semibold text-white',
        className,
      )}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  )
}
