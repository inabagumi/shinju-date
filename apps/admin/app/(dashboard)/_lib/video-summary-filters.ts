import type { Tables } from '@shinju-date/database'

type VideoStatus = Tables<'videos'>['status']

/**
 * The conditions of a tile of the video summary. The same condition counts the
 * videos of the tile and filters the video list that the tile links to, so
 * that the number of the tile matches the videos of the list.
 */
export interface VideoSummaryFilter {
  /** Count the deleted videos (`true`) or the videos not deleted (`false`) */
  deleted: boolean
  status?: readonly VideoStatus[]
  visible?: boolean
}

export type VideoSummaryTile =
  | 'totalVideos'
  | 'visibleVideos'
  | 'scheduledVideos'
  | 'hiddenVideos'
  | 'deletedVideos'

/** Statuses of the videos that viewers can watch */
export const PUBLIC_VIDEO_STATUSES = [
  'ENDED',
  'LIVE',
  'PUBLISHED',
] as const satisfies readonly VideoStatus[]

export const VIDEO_SUMMARY_FILTERS = {
  deletedVideos: { deleted: true },
  hiddenVideos: { deleted: false, visible: false },
  scheduledVideos: { deleted: false, status: ['UPCOMING'], visible: true },
  totalVideos: { deleted: false },
  visibleVideos: {
    deleted: false,
    status: PUBLIC_VIDEO_STATUSES,
    visible: true,
  },
} as const satisfies Record<VideoSummaryTile, VideoSummaryFilter>

/**
 * Build the URL of the video list filtered by the condition. `status` repeats
 * the parameter for each value, which the video list reads as multiple values.
 */
export function getVideoListHref(filter: VideoSummaryFilter): string {
  const searchParams = new URLSearchParams()

  searchParams.append('deleted', String(filter.deleted))

  if (filter.visible !== undefined) {
    searchParams.append('visible', String(filter.visible))
  }

  for (const status of filter.status ?? []) {
    searchParams.append('status', status)
  }

  return `/videos?${searchParams.toString()}`
}

interface VideoCountQuery<T> {
  eq(column: 'visible', value: boolean): T
  in(column: 'status', values: VideoStatus[]): T
  is(column: 'deleted_at', value: null): T
  not(column: 'deleted_at', operator: 'is', value: null): T
}

/** Narrow a query of the `videos` table down by the condition */
export function applyVideoSummaryFilter<T extends VideoCountQuery<T>>(
  query: T,
  filter: VideoSummaryFilter,
): T {
  let filtered = filter.deleted
    ? query.not('deleted_at', 'is', null)
    : query.is('deleted_at', null)

  if (filter.visible !== undefined) {
    filtered = filtered.eq('visible', filter.visible)
  }

  if (filter.status) {
    filtered = filtered.in('status', [...filter.status])
  }

  return filtered
}
