import type { Tables } from '@shinju-date/database'
import { twMerge } from 'tailwind-merge'

type VideoStatus = Tables<'videos'>['status']

interface VideoStatusInfo {
  deleted_at: string | null
  visible: boolean
  status: VideoStatus
}

type StatusInfo = {
  text: string
  colorClasses: string
}

function getStatusInfo(video: VideoStatusInfo): StatusInfo {
  // Priority 1: If deleted, show "削除済み"
  if (video.deleted_at) {
    return {
      colorClasses: 'bg-red-100 text-red-800',
      text: '削除済み',
    }
  }

  // Priority 2: If not visible, show "非表示"
  if (!video.visible) {
    return {
      colorClasses: 'bg-gray-100 text-gray-800',
      text: '非表示',
    }
  }

  // Priority 3: Show the status field content
  const STATUS_LABELS: Record<VideoStatus, string> = {
    ENDED: '配信済み',
    LIVE: '配信中',
    PUBLISHED: '公開済み',
    UPCOMING: '待機中',
  }

  const STATUS_COLORS: Record<VideoStatus, string> = {
    ENDED: 'bg-gray-100 text-gray-800',
    LIVE: 'bg-red-100 text-red-800',
    PUBLISHED: 'bg-gray-100 text-gray-800',
    UPCOMING: 'bg-blue-100 text-blue-800',
  }

  return {
    colorClasses: STATUS_COLORS[video.status] ?? 'bg-gray-100 text-gray-800',
    text: STATUS_LABELS[video.status] ?? video.status,
  }
}

interface VideoStatusBadgeProps {
  video: VideoStatusInfo
  className?: string
}

export function VideoStatusBadge({ video, className }: VideoStatusBadgeProps) {
  const statusInfo = getStatusInfo(video)

  return (
    <span
      className={twMerge(
        'whitespace-nowrap rounded px-2 py-1 text-xs',
        statusInfo.colorClasses,
        className,
      )}
    >
      {statusInfo.text}
    </span>
  )
}
