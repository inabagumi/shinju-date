import * as Sentry from '@sentry/nextjs'
import type { TablesInsert } from '@shinju-date/database'
import { isNonNullable } from '@shinju-date/helpers'
import { toDBString } from '@shinju-date/temporal-fns'
import type { YouTubeVideo } from '@shinju-date/youtube-scraper'
import { getPublishedAt, getVideoStatus } from '@shinju-date/youtube-scraper'
import { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from '@/lib/supabase'
import type { SavedVideo, Video } from './types'

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

export class DatabaseError extends Error {
  constructor(cause: unknown) {
    super('Database operation failed', { cause })
    this.name = 'DatabaseError'
  }
}

/**
 * Get saved videos from the database by YouTube video IDs
 */
export async function* getSavedVideos(
  supabaseClient: TypedSupabaseClient,
  ids: string[],
): AsyncGenerator<SavedVideo, void, undefined> {
  for (let i = 0; i < ids.length; i += 100) {
    const { data: videos, error } = await supabaseClient
      .from('youtube_videos')
      .select(
        `
          video:videos!inner (
            id,
            created_at,
            deleted_at,
            duration,
            platform,
            published_at,
            status,
            thumbnail_id,
            thumbnail:thumbnails (
              blur_data_url,
              deleted_at,
              etag,
              height,
              id,
              path,
              updated_at,
              width
            ),
            title,
            visible
          ),
          youtube_video_id
        `,
      )
      .in('youtube_video_id', ids.slice(i, i + 100))

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    // Transform the response to match expected SavedVideo structure
    const transformedVideos = videos.map((row) => {
      const video = Array.isArray(row.video) ? row.video[0] : row.video
      return {
        ...video,
        youtube_video: {
          youtube_video_id: row.youtube_video_id,
        },
      }
    })

    yield* transformedVideos
  }
}

/**
 * Upsert thumbnails to the database
 */
export async function upsertThumbnails(
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
 * Upsert videos to the database
 */
export async function upsertVideos(
  supabaseClient: TypedSupabaseClient,
  values: TablesInsert<'videos'>[],
  youtubeVideoIds: string[],
  youtubeChannelId: string,
): Promise<Video[]> {
  const dataToUpdate: {
    value: TablesInsert<'videos'>
    youtubeVideoId: string
  }[] = []
  const dataToInsert: {
    value: TablesInsert<'videos'>
    youtubeVideoId: string
  }[] = []

  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    const youtubeVideoId = youtubeVideoIds[i]

    if (!value || !youtubeVideoId) continue

    if ('id' in value && value.id) {
      dataToUpdate.push({
        value: value,
        youtubeVideoId,
      })
    } else {
      dataToInsert.push({
        value: value,
        youtubeVideoId,
      })
    }
  }

  const valuesToUpdate = dataToUpdate.map((d) => d.value)
  const valuesToInsert = dataToInsert.map((d) => d.value)

  const [updateResult, insertResult] = await Promise.allSettled([
    valuesToUpdate.length > 0
      ? supabaseClient
          .from('videos')
          .upsert(valuesToUpdate)
          .select(scrapeResultSelect)
          .then(({ data, error }) => {
            if (error) throw new DatabaseError(error)
            return data ?? []
          })
      : Promise.resolve([]),
    valuesToInsert.length > 0
      ? supabaseClient
          .from('videos')
          .insert(valuesToInsert)
          .select(scrapeResultSelect)
          .then(({ data, error }) => {
            if (error) throw new DatabaseError(error)
            return data ?? []
          })
      : Promise.resolve([]),
  ])

  const allVideos: Video[] = []
  const youtubeVideoValues: TablesInsert<'youtube_videos'>[] = []

  if (updateResult.status === 'fulfilled') {
    const updatedVideos = updateResult.value
    allVideos.push(...updatedVideos)

    for (const video of updatedVideos) {
      const originalData = dataToUpdate.find((d) => d.value.id === video.id)
      if (originalData) {
        youtubeVideoValues.push({
          video_id: video.id,
          youtube_channel_id: youtubeChannelId,
          youtube_video_id: originalData.youtubeVideoId,
        })
      }
    }
  } else {
    Sentry.captureException(updateResult.reason)
  }

  if (insertResult.status === 'fulfilled') {
    const insertedVideos = insertResult.value
    allVideos.push(...insertedVideos)

    for (const [index, video] of insertedVideos.entries()) {
      const originalData = dataToInsert[index]
      if (originalData) {
        youtubeVideoValues.push({
          video_id: video.id,
          youtube_channel_id: youtubeChannelId,
          youtube_video_id: originalData.youtubeVideoId,
        })
      }
    }
  } else {
    Sentry.captureException(insertResult.reason)
  }

  if (youtubeVideoValues.length > 0) {
    const { error } = await supabaseClient
      .from('youtube_videos')
      .upsert(youtubeVideoValues, { onConflict: 'video_id' })

    if (error) {
      Sentry.captureException(new DatabaseError(error))
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
 * Process videos from YouTube API and prepare them for database insertion/update
 */
export function processVideos(options: {
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

      if (!savedVideo) {
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
      }

      const updateValue: Partial<TablesInsert<'videos'>> = {}
      let hasUpdate = false

      if (savedVideo.status !== status) {
        updateValue.status = status
        hasUpdate = true
      }

      const newDuration = originalVideo.contentDetails?.duration ?? 'P0D'
      if (savedVideo.duration !== newDuration) {
        updateValue.duration = newDuration
        hasUpdate = true
      }

      const savedPublishedAt = Temporal.Instant.from(savedVideo.published_at)
      if (!savedPublishedAt.equals(publishedAt)) {
        updateValue.published_at = toDBString(publishedAt)
        hasUpdate = true
      }

      if (thumbnail && savedVideo.thumbnail_id !== thumbnail.id) {
        updateValue.thumbnail_id = thumbnail.id
        hasUpdate = true
      }

      const newTitle = originalVideo.snippet?.title ?? ''
      if (savedVideo.title !== newTitle) {
        updateValue.title = newTitle
        hasUpdate = true
      }

      if (savedVideo.deleted_at) {
        updateValue.deleted_at = null
        hasUpdate = true
      }

      if (!hasUpdate) {
        return null
      }

      return {
        value: {
          created_at: savedVideo.created_at,
          deleted_at:
            'deleted_at' in updateValue
              ? updateValue.deleted_at
              : savedVideo.deleted_at,
          duration: updateValue.duration ?? savedVideo.duration,
          id: savedVideo.id,
          platform: savedVideo.platform,
          published_at: updateValue.published_at ?? savedVideo.published_at,
          status: updateValue.status ?? savedVideo.status,
          talent_id: talentId,
          thumbnail_id: updateValue.thumbnail_id ?? savedVideo.thumbnail_id,
          title: updateValue.title ?? savedVideo.title,
          updated_at: toDBString(currentDateTime),
          visible: savedVideo.visible,
        },
        youtubeVideoId: originalVideo.id,
      }
    })
    .filter(isNonNullable)
}

/**
 * Process and save scraped videos from YouTube
 * This handles the complete flow: fetch saved videos, process thumbnails, transform data, and save to database
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

  // Import at runtime to avoid circular dependencies
  const { VideoThumbnailProcessor } = await import('@/lib/thumbnails')

  // 1. Get existing videos from database
  const videoIDs = originalVideos.map((video) => video.id)
  const savedVideos = await Array.fromAsync(
    getSavedVideos(supabaseClient, videoIDs),
  )

  // 2. Process and upload thumbnails
  const thumbnails = await VideoThumbnailProcessor.upsertThumbnails({
    currentDateTime,
    originalVideos,
    savedVideos,
    supabaseClient,
    upsertToDatabase: (values) => upsertThumbnails(supabaseClient, values),
  })

  // 3. Process video data (new and updated)
  const videoDataWithYouTubeIds = processVideos({
    currentDateTime,
    originalVideos,
    savedVideos,
    talentId,
    thumbnails,
  })

  // 4. Save to database
  if (videoDataWithYouTubeIds.length > 0) {
    const values = videoDataWithYouTubeIds.map((item) => item.value)
    const youtubeVideoIds = videoDataWithYouTubeIds.map(
      (item) => item.youtubeVideoId,
    )

    return upsertVideos(
      supabaseClient,
      values,
      youtubeVideoIds,
      youtubeChannelId,
    )
  }

  return []
}
