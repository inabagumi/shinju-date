import type { Tables } from '@shinju-date/database'
import { Badge } from '@shinju-date/ui'

type VideoStatus = Tables<'videos'>['status']

const STATUS_LABELS: Record<VideoStatus, string> = {
  ENDED: '公開済み',
  LIVE: '配信中',
  UPCOMING: '待機中',
}

const STATUS_VARIANTS: Record<VideoStatus, 'info' | 'error' | 'secondary'> = {
  ENDED: 'secondary',
  LIVE: 'error',
  UPCOMING: 'info',
}

export function StatusBadge({ status }: { status: VideoStatus }) {
  return (
    <Badge
      className="rounded-md ring-1 ring-current/20 ring-inset"
      variant={STATUS_VARIANTS[status] ?? 'secondary'}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
