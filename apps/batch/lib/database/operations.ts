import * as Sentry from '@sentry/nextjs'
import type { TablesInsert } from '@shinju-date/database'
import { isNonNullable } from '@shinju-date/helpers'
import { toDBString } from '@shinju-date/temporal-fns'
import type { YouTubeChannel, YouTubeVideo } from '@shinju-date/youtube-scraper'
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
 * Process and upload thumbnails for videos
 * This coordinates thumbnail processing and database insertion
 */
export async function processThumbnails(options: {
  currentDateTime?: Temporal.Instant
  dryRun?: boolean
  originalVideos: YouTubeVideo[]
  savedVideos: SavedVideo[]
  supabaseClient: TypedSupabaseClient
}): Promise<{ id: string; path: string }[]> {
  const { ImageProcessor } = await import('@/lib/thumbnails')
  const PQueue = (await import('p-queue')).default

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
export async function insertNewVideos(
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
 * Upsert videos to the database
 * Used by /videos/check route to update existing videos
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
 * Process NEW videos only from YouTube API and prepare them for database insertion
 * This function only handles videos that don't exist in the database yet
 * Existing videos are intentionally skipped - updates are handled by /videos/check
 */
export function processNewVideos(options: {
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
    savedVideos.map((saved) => saved.youtube_video?.youtube_video_id),
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

  // 4. Process ONLY new video data (skip existing videos)
  const videoDataWithYouTubeIds = processNewVideos({
    currentDateTime,
    originalVideos,
    savedVideos,
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

/**
 * Update a talent's YouTube channel information
 * Used by /talents/update route with callback pattern
 */
export type UpdateTalentChannelOptions = {
  supabaseClient: TypedSupabaseClient
  talentId: string
  youtubeChannelId: string
  channelName: string
  youtubeHandle: string | null
}

export async function updateTalentChannel({
  supabaseClient,
  talentId,
  youtubeChannelId,
  channelName,
  youtubeHandle,
}: UpdateTalentChannelOptions): Promise<void> {
  const { error } = await supabaseClient.from('youtube_channels').upsert(
    {
      name: channelName,
      talent_id: talentId,
      youtube_channel_id: youtubeChannelId,
      youtube_handle: youtubeHandle,
    },
    { onConflict: 'youtube_channel_id' },
  )

  if (error) {
    throw new DatabaseError(error)
  }
}

/**
 * Process scraped YouTube channels and update talent information
 * Uses snippet data already fetched by the scraper, logs changes, and returns whether updates occurred
 */
export async function processScrapedChannels({
  youtubeChannels,
  talents,
  supabaseClient,
}: {
  youtubeChannels: YouTubeChannel[]
  talents: {
    id: string
    name: string
    youtube_channels: {
      id: string
      name: string | null
      youtube_channel_id: string
    }[]
  }[]
  supabaseClient: TypedSupabaseClient
}): Promise<boolean> {
  let hasUpdates = false

  for (const youtubeChannel of youtubeChannels) {
    try {
      // Find the talent that has this YouTube channel
      const talent = talents.find((t) =>
        t.youtube_channels.some(
          (channel) => channel.youtube_channel_id === youtubeChannel.id,
        ),
      )

      if (!talent) {
        throw new TypeError(
          `No talent found for YouTube channel ID: ${youtubeChannel.id}`,
        )
      }

      // Type guard ensures snippet exists, but add explicit check for TypeScript
      if (!youtubeChannel.snippet?.title) {
        throw new TypeError(
          `YouTube channel snippet is missing for channel: ${youtubeChannel.id}`,
        )
      }

      // Find the specific channel entry for this talent
      const currentChannel = talent.youtube_channels.find(
        (channel) => channel.youtube_channel_id === youtubeChannel.id,
      )

      const currentYouTubeChannelName = currentChannel?.name
      const channelName = youtubeChannel.snippet.title
      const youtubeHandle = youtubeChannel.snippet.customUrl || null

      // Update youtube_channels table
      await updateTalentChannel({
        channelName,
        supabaseClient,
        talentId: talent.id,
        youtubeChannelId: youtubeChannel.id,
        youtubeHandle,
      })

      // Log and track if YouTube channel name changed
      if (channelName !== currentYouTubeChannelName) {
        Sentry.logger.info('YouTube channel name has been updated.', {
          youtube_channel_name: `${currentYouTubeChannelName} -> ${channelName}`,
        })
        hasUpdates = true
      }
    } catch (error) {
      Sentry.captureException(error)
    }
  }

  if (!hasUpdates) {
    Sentry.logger.info('No updated talents existed.')
  }

  return hasUpdates
}
