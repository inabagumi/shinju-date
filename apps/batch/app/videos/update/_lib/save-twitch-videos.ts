import * as Sentry from '@sentry/nextjs'
import type { TablesInsert } from '@shinju-date/database'
import { isNonNullable } from '@shinju-date/helpers'
import { toDBString } from '@shinju-date/temporal-fns'
import type { TwitchVideo } from '@shinju-date/twitch-api-client'
import PQueue from 'p-queue'
import { Temporal } from 'temporal-polyfill'
import { DatabaseError, getSavedTwitchVideos } from '@/lib/database/operations'
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
 * Maps Twitch video type to videos.status.
 * Archives and highlights are past broadcasts; uploads are regular videos.
 */
export function getTwitchVideoStatus(
  type: TwitchVideo['type'],
): 'ENDED' | 'PUBLISHED' {
  return type === 'upload' ? 'PUBLISHED' : 'ENDED'
}

async function insertThumbnails(
  supabaseClient: TypedSupabaseClient,
  values: TablesInsert<'thumbnails'>[],
): Promise<
  {
    id: string
    path: string
  }[]
> {
  if (values.length === 0) {
    return []
  }

  const { data, error } = await supabaseClient
    .from('thumbnails')
    .insert(values)
    .select('id, path')

  if (error) {
    throw new DatabaseError(error)
  }

  return data ?? []
}

async function processThumbnails(options: {
  currentDateTime?: Temporal.Instant
  originalVideos: TwitchVideo[]
  supabaseClient: TypedSupabaseClient
}): Promise<{ id: string; path: string }[]> {
  const queue = new PQueue({
    concurrency: 12,
    interval: 250,
  })

  const results = await Promise.allSettled(
    options.originalVideos.map((originalVideo) =>
      queue.add(() =>
        ImageProcessor.uploadFromUrl({
          currentDateTime: options.currentDateTime ?? Temporal.Now.instant(),
          mediaId: originalVideo.id,
          supabaseClient: options.supabaseClient,
          thumbnailUrl: originalVideo.thumbnail_url,
        }),
      ),
    ),
  )

  const values: TablesInsert<'thumbnails'>[] = []

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      values.push(result.value)
    } else if (result.status === 'rejected') {
      Sentry.captureException(result.reason)
    }
  }

  return insertThumbnails(options.supabaseClient, values)
}

async function insertNewTwitchVideos(
  supabaseClient: TypedSupabaseClient,
  values: TablesInsert<'videos'>[],
  twitchEntries: {
    twitchUserId: string
    twitchVideoId: string
    type: TwitchVideo['type']
  }[],
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
  const twitchVideoValues: TablesInsert<'twitch_videos'>[] = []

  for (const [index, video] of allVideos.entries()) {
    const entry = twitchEntries[index]
    if (entry) {
      twitchVideoValues.push({
        twitch_user_id: entry.twitchUserId,
        twitch_video_id: entry.twitchVideoId,
        type: entry.type,
        video_id: video.id,
      })
    }
  }

  if (twitchVideoValues.length > 0) {
    const { error: twitchError } = await supabaseClient
      .from('twitch_videos')
      .insert(twitchVideoValues)

    if (twitchError) {
      Sentry.captureException(new DatabaseError(twitchError))
    }
  }

  for (const video of allVideos) {
    const entry = twitchVideoValues.find((tv) => tv.video_id === video.id)
    if (entry) {
      video.twitch_video = {
        twitch_video_id: entry.twitch_video_id,
        type: entry.type ?? null,
      }
    }
  }

  return allVideos
}

function processNewTwitchVideos(options: {
  currentDateTime: Temporal.Instant
  originalVideos: TwitchVideo[]
  savedVideos: SavedVideo[]
  talentId: string
  thumbnails: { id: string; path: string }[]
}): {
  value: TablesInsert<'videos'>
  twitchVideoId: string
  type: TwitchVideo['type']
}[] {
  const { currentDateTime, originalVideos, savedVideos, talentId, thumbnails } =
    options

  return originalVideos
    .map<{
      value: TablesInsert<'videos'>
      twitchVideoId: string
      type: TwitchVideo['type']
    } | null>((originalVideo) => {
      const savedVideo = savedVideos.find(
        (v) => v.twitch_video?.twitch_video_id === originalVideo.id,
      )

      if (savedVideo) {
        return null
      }

      const thumbnail = thumbnails.find((t) =>
        t.path.startsWith(`${originalVideo.id}/`),
      )

      const publishedAt = Temporal.Instant.from(
        originalVideo.published_at || originalVideo.created_at,
      )

      return {
        twitchVideoId: originalVideo.id,
        type: originalVideo.type,
        value: {
          created_at: toDBString(currentDateTime),
          duration: originalVideo.duration,
          platform: 'twitch',
          published_at: toDBString(publishedAt),
          status: getTwitchVideoStatus(originalVideo.type),
          talent_id: talentId,
          title: originalVideo.title,
          updated_at: toDBString(currentDateTime),
          video_kind: 'standard',
          visible: true,
          ...(thumbnail ? { thumbnail_id: thumbnail.id } : {}),
        },
      }
    })
    .filter(isNonNullable)
}

/**
 * Process and save NEW Twitch videos (archives / highlights / uploads).
 * Existing videos are intentionally skipped — updates are handled by /videos/check.
 */
export async function saveTwitchVideos(options: {
  currentDateTime: Temporal.Instant
  originalVideos: TwitchVideo[]
  supabaseClient: TypedSupabaseClient
  talentId: string
  /** UUID of the twitch_users row (not the Helix user id) */
  twitchUserId: string
}): Promise<Video[]> {
  const {
    currentDateTime,
    originalVideos,
    supabaseClient,
    talentId,
    twitchUserId,
  } = options

  if (originalVideos.length === 0) {
    return []
  }

  const videoIDs = originalVideos.map((video) => video.id)
  const savedVideos = await Array.fromAsync(
    getSavedTwitchVideos(supabaseClient, videoIDs),
  )

  const existingVideoIds = new Set(
    savedVideos
      .map((saved) => saved.twitch_video?.twitch_video_id)
      .filter((id): id is string => id != null),
  )
  const newVideosOnly = originalVideos.filter(
    (video) => !existingVideoIds.has(video.id),
  )

  if (newVideosOnly.length === 0) {
    return []
  }

  const thumbnails = await processThumbnails({
    currentDateTime,
    originalVideos: newVideosOnly,
    supabaseClient,
  })

  const videoData = processNewTwitchVideos({
    currentDateTime,
    originalVideos: newVideosOnly,
    savedVideos: [],
    talentId,
    thumbnails,
  })

  if (videoData.length === 0) {
    return []
  }

  const values = videoData.map((item) => item.value)
  const twitchEntries = videoData.map((item) => ({
    twitchUserId,
    twitchVideoId: item.twitchVideoId,
    type: item.type,
  }))

  return insertNewTwitchVideos(supabaseClient, values, twitchEntries)
}
