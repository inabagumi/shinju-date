import { twMerge } from '@shinju-date/ui'

const SIZE_CLASS_NAMES = {
  /** For a row of the fixed height of `h-5`, such as in the schedule */
  compact: 'leading-4',
  default: '',
} as const

type LiveBadgeSize = keyof typeof SIZE_CLASS_NAMES

interface LiveBadgeProps {
  /** For the position. The look is given by the badge */
  className?: string | undefined
  id?: string | undefined
  size?: LiveBadgeSize | undefined
}

/**
 * The badge of a video or a talent that is live. Pink is kept for it, so
 * every badge of the kind is rendered with this.
 */
export default function LiveBadge({
  className,
  id,
  size = 'default',
}: LiveBadgeProps) {
  return (
    <span
      className={twMerge(
        'rounded-control bg-live px-1.5 py-0.5 text-caption font-semibold whitespace-nowrap text-live-foreground',
        SIZE_CLASS_NAMES[size],
        className,
      )}
      id={id}
    >
      配信中
    </span>
  )
}
