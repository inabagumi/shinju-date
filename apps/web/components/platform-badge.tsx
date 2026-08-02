import type { Tables } from '@shinju-date/database'
import { twMerge } from 'tailwind-merge'

const PLATFORM_LABELS: Record<Tables<'videos'>['platform'], string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
}

/**
 * Small platform indicator for video cards.
 * Twitch is emphasized so multi-platform results are easy to scan.
 */
export default function PlatformBadge({
  className,
  platform,
}: {
  className?: string
  platform: Tables<'videos'>['platform']
}) {
  if (platform === 'youtube') {
    return null
  }

  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-md bg-[#9146FF]/90 px-1.5 py-0.5 font-semibold text-white text-xs',
        className,
      )}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  )
}
