import * as Sentry from '@sentry/nextjs'
import type { TablesInsert } from '@shinju-date/database'
import { isNonNullable } from '@shinju-date/helpers'
import { toDBString } from '@shinju-date/temporal-fns'
import type { YouTubeVideo } from '@shinju-date/youtube-scraper'
import { getPublishedAt, getVideoStatus } from '@shinju-date/youtube-scraper'
import PQueue from 'p-queue'
import { Temporal } from 'temporal-polyfill'
import { DatabaseError, getSavedVideos } from '@/lib/database/operations'
import type { SavedVideo, Video } from '@/lib/database/types'
import type { TypedSupabaseClient } from '@/lib/supabase'
import { ImageProcessor } from '@/lib/thumbnails'

const scrapeResultSelect = `
  duration,
  id,
  published_at,
  status,
  talent:talents!inner (
    name
  ),
  thumbnail:thumbnails (
    blur_data_url,
    height,
    path,
    width
  ),
  title
`

/**
 * Upsert thumbnails to the database
 */
async function upsertThumbnails(
  supabaseClient: TypedSupabaseClient,
  values: TablesInsert<'thumbnails'>[],
): Promise<
  {
    id: string
    path: string
  }[]
> {
  const upsertValues = values.filter((value) => value.id)
  const insertValues = values.filter((value) => !value.id)
  const results = await Promise.allSettled([
    upsertValues.length > 0
      ? supabaseClient
          .from('thumbnails')
          .upsert(upsertValues)
          .select('id, path')
          .then(({ data, error }) => {
            if (error) {
              throw new DatabaseError(error)
            }

            return data
          })
      : Promise.resolve([]),
    insertValues.length > 0
      ? supabaseClient
          .from('thumbnails')
          .insert(insertValues)
          .select('id, path')
          .then(({ data, error }) => {
            if (error) {
              throw new DatabaseError(error)
            }

            return data
          })
      : Promise.resolve([]),
  ])

  const thumbnails: {
    id: string
    path: string
  }[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const thumbnail of result.value) {
        thumbnails.push(thumbnail)
      }
    } else {
      Sentry.captureException(result.reason)
    }
  }

  return thumbnails
}

/**
 * Process and upload thumbnails for videos
 * This coordinates thumbnail processing and database insertion
 */
async function processThumbnails(options: {
  currentDateTime?: Temporal.Instant
  dryRun?: boolean
  originalVideos: YouTubeVideo[]
  savedVideos: SavedVideo[]
  supabaseClient: TypedSupabaseClient
}): Promise<{ id: string; path: string }[]> {
  const queue = new PQueue({
    concurrency: 12,
    interval: 250,
  })

  const results = await Promise.allSettled(
    options.originalVideos.map((originalVideo) => {
      const savedVideo = options.savedVideos.find(
        (savedVideo) =>
          savedVideo.youtube_video?.youtube_video_id === originalVideo.id,
      )
      const savedThumbnail = savedVideo?.thumbnail

      return queue.add(() =>
        ImageProcessor.upload({
          currentDateTime: options.currentDateTime ?? Temporal.Now.instant(),
          dryRun: options.dryRun ?? false,
          originalVideo,
          ...(savedThumbnail ? { savedThumbnail } : {}),
          supabaseClient: options.supabaseClient,
        }),
      )
    }),
  )

  const values: TablesInsert<'thumbnails'>[] = []

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      values.push(result.value)
    } else if (result.status === 'rejected') {
      Sentry.captureException(result.reason)
    }
  }

  if (options.dryRun) {
    return []
  }

  return upsertThumbnails(options.supabaseClient, values)
}

/**
 * Insert new videos to the database (no updates)
 * Used by /videos/update route to add new videos only
 */
async function insertNewVideos(
  supabaseClient: TypedSupabaseClient,
  values: TablesInsert<'videos'>[],
  youtubeVideoIds: string[],
  youtubeChannelId: string,
): Promise<Video[]> {
  if (values.length === 0) {
    return []
  }

  const { data: insertedVideos, error } = await supabaseClient
    .from('videos')
    .insert(values)
    .select(scrapeResultSelect)

  if (error) {
    throw new DatabaseError(error)
  }

  const allVideos: Video[] = insertedVideos ?? []
  const youtubeVideoValues: TablesInsert<'youtube_videos'>[] = []

  for (const [index, video] of allVideos.entries()) {
    const youtubeVideoId = youtubeVideoIds[index]
    if (youtubeVideoId) {
      youtubeVideoValues.push({
        video_id: video.id,
        youtube_channel_id: youtubeChannelId,
        youtube_video_id: youtubeVideoId,
      })
    }
  }

  if (youtubeVideoValues.length > 0) {
    const { error: ytError } = await supabaseClient
      .from('youtube_videos')
      .insert(youtubeVideoValues)

    if (ytError) {
      Sentry.captureException(new DatabaseError(ytError))
    }
  }

  for (const video of allVideos) {
    const entry = youtubeVideoValues.find((yv) => yv.video_id === video.id)
    if (entry) {
      video.youtube_video = {
        youtube_video_id: entry.youtube_video_id,
      }
    }
  }

  return allVideos
}

/**
 * Process NEW videos only from YouTube API and prepare them for database insertion
 * This function only handles videos that don't exist in the database yet
 * Existing videos are intentionally skipped - updates are handled by /videos/check
 */
function processNewVideos(options: {
  currentDateTime: Temporal.Instant
  originalVideos: YouTubeVideo[]
  savedVideos: SavedVideo[]
  talentId: string
  thumbnails: { id: string; path: string }[]
}): {
  value: TablesInsert<'videos'>
  youtubeVideoId: string
}[] {
  const { currentDateTime, originalVideos, savedVideos, talentId, thumbnails } =
    options

  return originalVideos
    .map<{
      value: TablesInsert<'videos'>
      youtubeVideoId: string
    } | null>((originalVideo) => {
      const savedVideo = savedVideos.find(
        (v) => v.youtube_video?.youtube_video_id === originalVideo.id,
      )

      // Skip if video already exists - updates are handled by /videos/check
      if (savedVideo) {
        return null
      }

      const thumbnail = thumbnails.find((t) =>
        t.path.startsWith(`${originalVideo.id}/`),
      )
      const publishedAt = getPublishedAt(originalVideo)

      if (!publishedAt) {
        Sentry.captureMessage(
          `PublishedAt could not be determined for video ID: ${originalVideo.id}`,
          'warning',
        )
        return null
      }

      const status = getVideoStatus(originalVideo, currentDateTime)

      return {
        value: {
          created_at: toDBString(currentDateTime),
          duration: originalVideo.contentDetails?.duration ?? 'P0D',
          platform: 'youtube',
          published_at: toDBString(publishedAt),
          status,
          talent_id: talentId,
          title: originalVideo.snippet?.title ?? '',
          updated_at: toDBString(currentDateTime),
          visible: true,
          ...(thumbnail ? { thumbnail_id: thumbnail.id } : {}),
        },
        youtubeVideoId: originalVideo.id,
      }
    })
    .filter(isNonNullable)
}

/**
 * Process and save NEW scraped videos from YouTube
 * This handles ONLY new video insertion - existing videos are NOT updated
 * Updates to existing videos are handled by /videos/check route
 */
export async function saveScrapedVideos(options: {
  currentDateTime: Temporal.Instant
  originalVideos: YouTubeVideo[]
  supabaseClient: TypedSupabaseClient
  talentId: string
  youtubeChannelId: string
}): Promise<Video[]> {
  const {
    currentDateTime,
    originalVideos,
    supabaseClient,
    talentId,
    youtubeChannelId,
  } = options

  // 1. Get existing videos from database
  const videoIDs = originalVideos.map((video) => video.id)
  const savedVideos = await Array.fromAsync(
    getSavedVideos(supabaseClient, videoIDs),
  )

  // 2. Identify new videos by filtering out existing ones
  const existingVideoIds = new Set(
    savedVideos
      .map((saved) => saved.youtube_video?.youtube_video_id)
      .filter((id): id is string => id != null),
  )
  const newVideosOnly = originalVideos.filter(
    (video) => !existingVideoIds.has(video.id),
  )

  // 3. Process and upload thumbnails (only for new videos to avoid unnecessary processing)
  const thumbnails = await processThumbnails({
    currentDateTime,
    originalVideos: newVideosOnly,
    savedVideos: [],
    supabaseClient,
  })

  // 4. Process ONLY new video data
  // Empty savedVideos array since we already filtered to newVideosOnly above
  const videoDataWithYouTubeIds = processNewVideos({
    currentDateTime,
    originalVideos: newVideosOnly, // Pass pre-filtered list
    savedVideos: [], // Already filtered, no need to check existence again
    talentId,
    thumbnails,
  })

  // 5. Insert new videos to database (no updates)
  if (videoDataWithYouTubeIds.length > 0) {
    const values = videoDataWithYouTubeIds.map((item) => item.value)
    const youtubeVideoIds = videoDataWithYouTubeIds.map(
      (item) => item.youtubeVideoId,
    )

    return insertNewVideos(
      supabaseClient,
      values,
      youtubeVideoIds,
      youtubeChannelId,
    )
  }

  return []
}
