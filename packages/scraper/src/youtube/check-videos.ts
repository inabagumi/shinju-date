import {
  type RefreshScope,
  refreshSavedVideos,
} from '../internal/operations/refresh-saved-videos.js'
import { sweepUnavailableVideos } from '../internal/operations/sweep-unavailable-videos.js'
import type { CrawlContext } from '../types.js'
import type { YouTubeFetcher } from './fetcher.js'
import { createYouTubePlatform } from './platform.js'

/**
 * Brings saved videos in line with YouTube: updates what changed (status,
 * schedule, title, duration) and soft-deletes videos YouTube no longer returns.
 *
 * @returns The number of videos updated or deleted.
 */
export function refreshYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>,
  scope: RefreshScope,
): Promise<number> {
  const platform = createYouTubePlatform(context.fetcher)

  return refreshSavedVideos(context, platform, { scope })
}

/**
 * Checks every saved video of non-deleted talents (retired ones included) and
 * soft-deletes those YouTube no longer returns. Details are not refreshed.
 *
 * @returns The number of videos deleted.
 */
export function removeUnavailableYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>,
): Promise<number> {
  return sweepUnavailableVideos(context, createYouTubePlatform(context.fetcher))
}
