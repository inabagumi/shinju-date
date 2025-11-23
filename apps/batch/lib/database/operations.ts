import * as Sentry from '@sentry/nextjs'
import type { TablesInsert } from '@shinju-date/database'
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
