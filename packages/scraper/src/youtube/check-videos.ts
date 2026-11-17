import type { TablesUpdate } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { countChanges } from '../internal/concurrency.js'
import {
  RECENT_VIDEO_COUNT,
  SWEEP_PAGE_SIZE,
  WRITE_CONCURRENCY,
} from '../internal/constants.js'
import {
  DatabaseError,
  paginateById,
  softDeleteUnavailableVideos,
  updateVideo,
} from '../internal/database/index.js'
import { diffVideoFields } from '../internal/video-fields.js'
import type {
  CrawlContext,
  RefreshVideoResult,
  TypedSupabaseClient,
  WriteContext,
} from '../types.js'
import type { YouTubeFetcher } from './fetcher.js'
import type { YouTubeVideo } from './types.js'
import { getVideoChanges, type YouTubeVideoFields } from './video.js'

/**
 * Which saved videos a refresh looks at:
 * - `live`: every scheduled or live video
 * - `recent`: the newest finished videos
 */
export type YouTubeRefreshScope = 'live' | 'recent'

export interface SavedYouTubeVideo extends YouTubeVideoFields {
  id: string
  thumbnail_id: string | null
  youtube_video: {
    youtube_video_id: string
  }
}

const SAVED_VIDEO_SELECT =
  'id, duration, published_at, status, thumbnail_id, title, video_kind, youtube_video:youtube_videos!inner(youtube_video_id)'

/**
 * Loads the videos a refresh looks at, for active talents only.
 */
async function getVideosToRefresh(
  supabaseClient: TypedSupabaseClient,
  scope: YouTubeRefreshScope,
): Promise<SavedYouTubeVideo[]> {
  const query = supabaseClient
    .from('videos')
    .select(`${SAVED_VIDEO_SELECT}, talent:talents!inner(id)`)
    .eq('platform', 'youtube')
    .is('deleted_at', null)
    .is('talent.deleted_at', null)
    .eq('talent.status', 'active')
    .order('published_at', { ascending: false })

  const { data, error } =
    scope === 'recent'
      ? await query
          .in('status', ['ENDED', 'PUBLISHED'])
          .limit(RECENT_VIDEO_COUNT)
      : await query.in('status', ['UPCOMING', 'LIVE'])

  if (error) {
    throw new DatabaseError('Failed to load YouTube videos to refresh', error)
  }

  return data
}

/**
 * Writes what changed on YouTube to a saved video.
 *
 * @returns The columns that changed, or `null` when the video is up to date.
 */
async function updateFromYouTube(
  { now, supabaseClient }: WriteContext,
  saved: SavedYouTubeVideo,
  video: YouTubeVideo,
): Promise<TablesUpdate<'videos'> | null> {
  const changes = getVideoChanges(saved, video, now)

  if (!changes) {
    return null
  }

  await updateVideo(supabaseClient, saved.id, {
    ...changes,
    updated_at: toDBString(now),
  })

  return changes
}

/**
 * Brings saved videos in line with YouTube: updates what changed (status,
 * schedule, title, duration) and soft-deletes videos YouTube no longer returns.
 *
 * @returns The number of videos updated or deleted.
 */
export async function refreshYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>,
  scope: YouTubeRefreshScope,
): Promise<number> {
  const { fetcher, logger, reportError, supabaseClient } = context
  const savedVideos = await getVideosToRefresh(supabaseClient, scope)

  if (savedVideos.length === 0) {
    return 0
  }

  const savedByYouTubeId = new Map(
    savedVideos.map((saved) => [saved.youtube_video.youtube_video_id, saved]),
  )
  const { missingIds, videos } = await fetcher.getVideos([
    ...savedByYouTubeId.keys(),
  ])

  const updatedCount = await countChanges(
    videos,
    WRITE_CONCURRENCY,
    async (video) => {
      const saved = savedByYouTubeId.get(video.id)

      return saved
        ? (await updateFromYouTube(context, saved, video)) !== null
        : false
    },
    (error, video) => reportError(error, { youtubeVideoId: video.id }),
  )

  if (updatedCount > 0) {
    logger.info('動画を更新しました', {
      count: updatedCount,
      platform: 'youtube',
      scope,
    })
  }

  const deletedCount = await deleteMissingVideos(
    context,
    missingIds,
    savedByYouTubeId,
  )

  return updatedCount + deletedCount
}

async function deleteMissingVideos(
  { logger, now, supabaseClient }: WriteContext,
  missingIds: readonly string[],
  savedByYouTubeId: ReadonlyMap<
    string,
    Pick<SavedYouTubeVideo, 'id' | 'thumbnail_id'>
  >,
): Promise<number> {
  const missingVideos = missingIds
    .map((id) => savedByYouTubeId.get(id))
    .filter((saved) => saved !== undefined)

  if (missingVideos.length === 0) {
    return 0
  }

  const deletedCount = await softDeleteUnavailableVideos(supabaseClient, {
    now,
    thumbnailIds: missingVideos
      .map((saved) => saved.thumbnail_id)
      .filter((id) => id !== null),
    videoIds: missingVideos.map((saved) => saved.id),
  })

  logger.info('公開されなくなった動画を削除しました', {
    count: deletedCount,
    platform: 'youtube',
    youtubeVideoIds: missingIds.join(','),
  })

  return deletedCount
}

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
    .select(SAVED_VIDEO_SELECT)
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

  const youtubeVideoId = saved.youtube_video.youtube_video_id
  const { missingIds, videos } = await fetcher.getVideos([youtubeVideoId])
  const video = videos.find((candidate) => candidate.id === youtubeVideoId)

  if (!video) {
    await deleteMissingVideos(
      context,
      missingIds,
      new Map([[youtubeVideoId, saved]]),
    )

    return { status: 'unavailable' }
  }

  const changes = await updateFromYouTube(context, saved, video)

  if (!changes) {
    return { status: 'unchanged', title: saved.title }
  }

  const after = { ...saved, ...changes }

  logger.info('動画を更新しました', {
    platform: 'youtube',
    videoId,
    youtubeVideoId,
  })

  return {
    ...diffVideoFields(saved, after),
    status: 'updated',
    title: after.title,
  }
}

type SweptYouTubeVideo = Pick<
  SavedYouTubeVideo,
  'id' | 'thumbnail_id' | 'youtube_video'
>

async function getSweepPage(
  supabaseClient: TypedSupabaseClient,
  cursor: string | undefined,
): Promise<SweptYouTubeVideo[]> {
  let query = supabaseClient
    .from('videos')
    .select(
      'id, thumbnail_id, youtube_video:youtube_videos!inner(youtube_video_id), talent:talents!inner(id)',
    )
    .eq('platform', 'youtube')
    .is('deleted_at', null)
    .is('talent.deleted_at', null)
    .order('id', { ascending: true })
    .limit(SWEEP_PAGE_SIZE)

  if (cursor) {
    query = query.gt('id', cursor)
  }

  const { data, error } = await query

  if (error) {
    throw new DatabaseError('Failed to load YouTube videos to sweep', error)
  }

  return data
}

/**
 * Checks every saved video of non-deleted talents (retired ones included) and
 * soft-deletes those YouTube no longer returns. Details are not refreshed.
 *
 * @returns The number of videos deleted.
 */
export async function removeUnavailableYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>,
): Promise<number> {
  const { fetcher, supabaseClient } = context
  let deletedCount = 0

  for await (const page of paginateById((cursor) =>
    getSweepPage(supabaseClient, cursor),
  )) {
    const savedByYouTubeId = new Map(
      page.map((saved) => [saved.youtube_video.youtube_video_id, saved]),
    )
    const missingIds = await fetcher.findMissingVideoIds([
      ...savedByYouTubeId.keys(),
    ])

    deletedCount += await deleteMissingVideos(
      context,
      missingIds,
      savedByYouTubeId,
    )
  }

  return deletedCount
}
