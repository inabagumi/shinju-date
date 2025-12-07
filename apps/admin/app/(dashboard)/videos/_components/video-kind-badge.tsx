import type Database from '@shinju-date/database'
import { Badge, type BadgeProps } from '@shinju-date/ui'

type VideoKind = Database['public']['Enums']['video_kind']

const VIDEO_KIND_LABELS: Record<VideoKind, string> = {
  short: 'ショート',
  standard: '通常',
}

const VIDEO_KIND_VARIANTS: Record<VideoKind, BadgeProps['variant']> = {
  short: 'info',
  standard: 'secondary',
}

interface VideoKindBadgeProps {
  videoKind: VideoKind
  className?: string
}

export function VideoKindBadge({ videoKind, className }: VideoKindBadgeProps) {
  const variant = VIDEO_KIND_VARIANTS[videoKind] ?? 'secondary'
  const text = VIDEO_KIND_LABELS[videoKind] ?? videoKind

  return (
    <Badge className={className} variant={variant}>
      {text}
    </Badge>
  )
}
