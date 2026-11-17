import type { Tables } from '@shinju-date/database'
import { Badge, type BadgeProps, twMerge } from '@shinju-date/ui'

type VideoStatus = Tables<'videos'>['status']

interface VideoStatusInfo {
  deleted_at: string | null
  visible: boolean
  status: VideoStatus
}

const STATUS_LABELS: Record<VideoStatus, string> = {
  ENDED: '配信済み',
  LIVE: '配信中',
  PUBLISHED: '公開済み',
  UPCOMING: '待機中',
}

function getBadgeVariant(video: VideoStatusInfo): BadgeProps['variant'] {
  // Priority 1: If deleted, show "削除済み" with danger variant (red)
  if (video.deleted_at) {
    return 'danger'
  }

  // Priority 2: If not visible, show "非表示" with neutral variant (gray)
  if (!video.visible) {
    return 'neutral'
  }

  // Priority 3: Show the status field content with appropriate variant
  const statusVariantMap: Record<VideoStatus, BadgeProps['variant']> = {
    ENDED: 'neutral',
    LIVE: 'danger',
    PUBLISHED: 'neutral',
    UPCOMING: 'info',
  }

  return statusVariantMap[video.status] ?? 'neutral'
}

function getStatusText(video: VideoStatusInfo): string {
  // Priority 1: If deleted, show "削除済み"
  if (video.deleted_at) {
    return '削除済み'
  }

  // Priority 2: If not visible, show "非表示"
  if (!video.visible) {
    return '非表示'
  }

  // Priority 3: Show the status field content
  return STATUS_LABELS[video.status] ?? video.status
}

interface VideoStatusBadgeProps {
  video: VideoStatusInfo
  className?: string
}

export function VideoStatusBadge({ video, className }: VideoStatusBadgeProps) {
  const variant = getBadgeVariant(video)
  const text = getStatusText(video)
  // 配信中は公開サイトと同じ `live` の色（ピンク）で示す
  const isLive = !video.deleted_at && video.visible && video.status === 'LIVE'

  return (
    <Badge
      className={twMerge(
        isLive && 'border-transparent bg-live text-live-foreground',
        className,
      )}
      variant={variant}
    >
      {text}
    </Badge>
  )
}
