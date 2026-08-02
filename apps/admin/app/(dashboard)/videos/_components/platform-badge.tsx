import type { Tables } from '@shinju-date/database'
import { Badge, type BadgeProps } from '@shinju-date/ui'

type Platform = Tables<'videos'>['platform']

const PLATFORM_LABELS: Record<Platform, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
}

const PLATFORM_VARIANTS: Record<Platform, BadgeProps['variant']> = {
  twitch: 'info',
  youtube: 'secondary',
}

interface PlatformBadgeProps {
  platform: Platform
  className?: string
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const variant = PLATFORM_VARIANTS[platform] ?? 'secondary'
  const text = PLATFORM_LABELS[platform] ?? platform

  return (
    <Badge className={className} variant={variant}>
      {text}
    </Badge>
  )
}
