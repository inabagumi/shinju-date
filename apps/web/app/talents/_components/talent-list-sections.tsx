import { logger } from '@shinju-date/logger'
import {
  fetchTalentList,
  fetchTalentStreamStatuses,
  type TalentStreamStatus,
} from '@/lib/fetchers'
import TalentGrid from './talent-grid'

/**
 * The number of talents, shown where the description of the page goes.
 * `fetchTalentList` is cached, so the talents are fetched only once with
 * `TalentListGrid`.
 */
export async function TalentCount() {
  const talents = await fetchTalentList()

  return <p className="tabular-nums">{talents.length}人</p>
}

export function TalentCountSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-[1lh] w-12 animate-pulse rounded-control bg-muted"
    />
  )
}

/**
 * Whether each talent is live and when it streams next. The list is still
 * shown with the icons and the names when they cannot be fetched.
 */
async function getStreamStatuses(): Promise<
  Record<string, TalentStreamStatus>
> {
  try {
    return await fetchTalentStreamStatuses()
  } catch (error) {
    logger.error('Failed to fetch the stream statuses of the talents', {
      error,
    })

    return {}
  }
}

export async function TalentListGrid() {
  const [talents, streamStatuses] = await Promise.all([
    fetchTalentList(),
    getStreamStatuses(),
  ])

  return <TalentGrid streamStatuses={streamStatuses} talents={talents} />
}
