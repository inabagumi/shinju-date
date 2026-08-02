import * as Sentry from '@sentry/nextjs'
import type { TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { TwitchVideo } from '@shinju-date/twitch-api-client'
import PQueue from 'p-queue'
import { Temporal } from 'temporal-polyfill'
import { DatabaseError, getSavedTwitchVideos } from '@/lib/database/operations'
import type { Video } from '@/lib/database/types'
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

/**
 * Insert one video + its twitch_videos row as a pair so we never rely on
 * multi-row insert order to correlate platform IDs.
 */
async function insertTwitchVideoPair(
  supabaseClient: TypedSupabaseClient,
  value: TablesInsert<'videos'>,
  twitchEntry: {
    twitchUserId: string
    twitchVideoId: string
    type: TwitchVideo['type']
  },
): Promise<Video | null> {
  const { data: insertedVideo, error } = await supabaseClient
    .from('videos')
    .insert(value)
    .select(scrapeResultSelect)
    .single()

  if (error) {
    throw new DatabaseError(error)
  }

  if (!insertedVideo) {
    return null
  }

  const { error: twitchError } = await supabaseClient
    .from('twitch_videos')
    .insert({
      twitch_user_id: twitchEntry.twitchUserId,
      twitch_video_id: twitchEntry.twitchVideoId,
      type: twitchEntry.type,
      video_id: insertedVideo.id,
    })

  if (twitchError) {
    // Avoid leaving platform-less video rows when linkage fails.
    Sentry.captureException(new DatabaseError(twitchError))
    await supabaseClient.from('videos').delete().eq('id', insertedVideo.id)
    return null
  }

  return {
    ...insertedVideo,
    twitch_video: {
      twitch_video_id: twitchEntry.twitchVideoId,
      type: twitchEntry.type,
    },
  }
}

function buildNewTwitchVideoRows(options: {
  currentDateTime: Temporal.Instant
  originalVideos: TwitchVideo[]
  talentId: string
  thumbnails: { id: string; path: string }[]
  twitchUserId: string
}): {
  value: TablesInsert<'videos'>
  twitchUserId: string
  twitchVideoId: string
  type: TwitchVideo['type']
}[] {
  const {
    currentDateTime,
    originalVideos,
    talentId,
    thumbnails,
    twitchUserId,
  } = options

  return originalVideos.map((originalVideo) => {
    const thumbnail = thumbnails.find((t) =>
      t.path.startsWith(`${originalVideo.id}/`),
    )

    const publishedAt = Temporal.Instant.from(
      originalVideo.published_at || originalVideo.created_at,
    )

    return {
      twitchUserId,
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

  const videoData = buildNewTwitchVideoRows({
    currentDateTime,
    originalVideos: newVideosOnly,
    talentId,
    thumbnails,
    twitchUserId,
  })

  if (videoData.length === 0) {
    return []
  }

  const settled = await Promise.allSettled(
    videoData.map((item) =>
      insertTwitchVideoPair(supabaseClient, item.value, {
        twitchUserId: item.twitchUserId,
        twitchVideoId: item.twitchVideoId,
        type: item.type,
      }),
    ),
  )

  const saved: Video[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value) {
      saved.push(result.value)
    } else if (result.status === 'rejected') {
      Sentry.captureException(result.reason)
    }
  }

  return saved
}
