import { DatabaseError } from '../internal/errors.js'
import { compareVideoFields } from '../internal/operations/diff-video-fields.js'
import { refreshSavedVideo } from '../internal/operations/refresh-saved-videos.js'
import type { CrawlContext, RefreshVideoResult } from '../types.js'
import type { YouTubeFetcher } from './fetcher.js'
import { createYouTubePlatform } from './platform.js'
import { SAVED_YOUTUBE_VIDEO_COLUMNS } from './saved-video.js'
import { refreshYouTubeThumbnail } from './thumbnail.js'

/**
 * Brings one saved video in line with YouTube, the same way the scheduled
 * refreshes do: updates what changed, or soft-deletes the video when YouTube
 * no longer returns it.
 *
 * Unlike the scheduled refreshes, the video is refreshed whatever its status
 * and whatever the status of its talent.
 */
export async function refreshYouTubeVideo(
  context: CrawlContext<YouTubeFetcher>,
  videoId: string,
): Promise<RefreshVideoResult> {
  const { fetcher, logger, supabaseClient } = context
  const { data: saved, error } = await supabaseClient
    .from('videos')
    .select(SAVED_YOUTUBE_VIDEO_COLUMNS)
    .eq('id', videoId)
    .eq('platform', 'youtube')
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new DatabaseError('Failed to load a YouTube video', error)
  }

  if (!saved) {
    return { status: 'not-found' }
  }

  const platform = createYouTubePlatform(fetcher)
  const result = await refreshSavedVideo(context, platform, saved, {
    afterRefresh: (current, fetched) =>
      refreshYouTubeThumbnail(context, current, fetched),
  })

  if (result === null || result === 'unavailable') {
    return { status: 'unavailable' }
  }

  if (!result.changed) {
    return { status: 'unchanged', title: saved.title }
  }

  const after = { ...saved, ...result.changes }

  logger.info('動画を更新しました', {
    platform: 'youtube',
    videoId,
    youtubeVideoId: saved.youtube_video.youtube_video_id,
  })

  return {
    ...compareVideoFields(saved, after),
    status: 'updated',
    title: after.title,
  }
}
