import type { Tables } from '@shinju-date/database'
import { twMerge } from 'tailwind-merge'

type VideoStatus = Tables<'videos'>['status']

const STATUS_LABELS: Record<VideoStatus, string> = {
  ENDED: '公開済み',
  LIVE: '配信中',
  UPCOMING: '待機中',
}

const STATUS_COLORS: Record<VideoStatus, string> = {
  ENDED: 'bg-gray-100 text-gray-800 ring-gray-600/20',
  LIVE: 'bg-red-100 text-red-800 ring-red-600/20',
  UPCOMING: 'bg-blue-100 text-blue-800 ring-blue-600/20',
}

export function StatusBadge({ status }: { status: VideoStatus }) {
  return (
    <span
      className={twMerge(
        `inline-flex items-center rounded-md px-2 py-1 font-medium text-xs ring-1 ring-inset`,
        STATUS_COLORS[status] ?? STATUS_COLORS['ENDED'],
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
