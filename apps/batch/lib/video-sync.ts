import { CACHE_TAGS, REDIS_KEYS } from '@shinju-date/constants'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { redisClient } from './redis'

/**
 * How long the time of the last sync is kept. When no sync has run for this
 * long, the admin dashboard shows it as unknown.
 */
export const LAST_VIDEO_SYNC_TTL_SECONDS = 30 * 24 * 60 * 60

export interface FinishVideoSyncOptions {
  /** Whether the run changed anything visible on the public site. */
  changed: boolean
  now: Temporal.Instant
  signal?: AbortSignal
}

/**
 * Wraps up a video crawl: refreshes the public site's cache when something
 * changed and records when videos were last synced (shown in the admin
 * dashboard, shared by every provider).
 */
export async function finishVideoSync({
  changed,
  now,
  signal,
}: FinishVideoSyncOptions): Promise<void> {
  if (changed) {
    await revalidateTags([CACHE_TAGS.VIDEOS], { signal })
  }

  await redisClient.set(REDIS_KEYS.LAST_VIDEO_SYNC, toDBString(now), {
    ex: LAST_VIDEO_SYNC_TTL_SECONDS,
  })
}
