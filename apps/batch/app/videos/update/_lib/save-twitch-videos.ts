import * as Sentry from '@sentry/nextjs'
import type { TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { TwitchVideo } from '@shinju-date/twitch-api-client'
import { isLiveTwitchVideoId } from '@shinju-date/twitch-api-client'
import PQueue from 'p-queue'
import { Temporal } from 'temporal-polyfill'
import {
  DatabaseError,
  getSavedTwitchVideos,
  getSavedTwitchVideosByStreamIds,
} from '@/lib/database/operations'
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

/**
 * Insert one video + its twitch_videos row as a pair so we never rely on
 * multi-row insert order to correlate platform IDs.
 */
async function insertTwitchVideoPair(
  supabaseClient: TypedSupabaseClient,
  value: TablesInsert<'videos'>,
  twitchEntry: {
    streamId: string | null
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
      stream_id: twitchEntry.streamId,
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
      stream_id: twitchEntry.streamId,
      twitch_video_id: twitchEntry.twitchVideoId,
      type: twitchEntry.type,
    },
  }
}

/**
 * Promote a LIVE (or recently ended) placeholder row to a real archive VOD.
 * Updates videos + twitch_videos in place so history stays on one record.
 */
async function reconcileLivePlaceholderToArchive(options: {
  currentDateTime: Temporal.Instant
  originalVideo: TwitchVideo
  savedVideo: SavedVideo
  supabaseClient: TypedSupabaseClient
  thumbnailId?: string
}): Promise<Video | null> {
  const {
    currentDateTime,
    originalVideo,
    savedVideo,
    supabaseClient,
    thumbnailId,
  } = options

  const publishedAt = Temporal.Instant.from(
    originalVideo.published_at || originalVideo.created_at,
  )

  const { data: updatedVideo, error: videoError } = await supabaseClient
    .from('videos')
    .update({
      duration: originalVideo.duration,
      published_at: toDBString(publishedAt),
      status: getTwitchVideoStatus(originalVideo.type),
      title: originalVideo.title,
      updated_at: toDBString(currentDateTime),
      ...(thumbnailId ? { thumbnail_id: thumbnailId } : {}),
    })
    .eq('id', savedVideo.id)
    .select(scrapeResultSelect)
    .single()

  if (videoError) {
    throw new DatabaseError(videoError)
  }

  const { error: twitchError } = await supabaseClient
    .from('twitch_videos')
    .update({
      stream_id: originalVideo.stream_id,
      twitch_video_id: originalVideo.id,
      type: originalVideo.type,
    })
    .eq('video_id', savedVideo.id)

  if (twitchError) {
    // twitch_videos update failed — restore videos so it isn't left ENDED
    // with a stale synthetic twitch_video_id, mirroring insertTwitchVideoPair.
    await supabaseClient
      .from('videos')
      .update({
        duration: savedVideo.duration,
        published_at: savedVideo.published_at,
        status: savedVideo.status,
        thumbnail_id: savedVideo.thumbnail_id,
        title: savedVideo.title,
      })
      .eq('id', savedVideo.id)

    throw new DatabaseError(twitchError)
  }

  if (!updatedVideo) {
    return null
  }

  return {
    ...updatedVideo,
    twitch_video: {
      stream_id: originalVideo.stream_id,
      twitch_video_id: originalVideo.id,
      type: originalVideo.type,
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
  streamId: string | null
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
      streamId: originalVideo.stream_id,
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
 *
 * Existing VOD/clip IDs are skipped. When an archive's `stream_id` matches a
 * LIVE placeholder (`live:{stream_id}`), that row is updated in place instead
 * of inserting a duplicate.
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
  const streamIds = originalVideos
    .map((video) => video.stream_id)
    .filter((id): id is string => id != null && id.length > 0)

  const [savedByVideoId, savedByStreamId] = await Promise.all([
    Array.fromAsync(getSavedTwitchVideos(supabaseClient, videoIDs)),
    streamIds.length > 0
      ? Array.fromAsync(
          getSavedTwitchVideosByStreamIds(supabaseClient, streamIds),
        )
      : Promise.resolve([] as SavedVideo[]),
  ])

  const existingVideoIds = new Set(
    savedByVideoId
      .map((saved) => saved.twitch_video?.twitch_video_id)
      .filter((id): id is string => id != null),
  )

  const existingByStreamId = new Map<string, SavedVideo>()
  for (const saved of savedByStreamId) {
    const streamId = saved.twitch_video?.stream_id
    if (streamId && !existingByStreamId.has(streamId)) {
      existingByStreamId.set(streamId, saved)
    }
  }

  const toInsert: TwitchVideo[] = []
  const toReconcile: Array<{
    originalVideo: TwitchVideo
    savedVideo: SavedVideo
  }> = []

  for (const video of originalVideos) {
    if (existingVideoIds.has(video.id)) {
      continue
    }

    if (video.stream_id) {
      const byStream = existingByStreamId.get(video.stream_id)
      if (byStream?.twitch_video) {
        const platformId = byStream.twitch_video.twitch_video_id
        const isLivePlaceholder = isLiveTwitchVideoId(platformId)
        // Only promote synthetic live placeholders when the new video is an
        // archive (matches process-twitch-live-for-check.ts's archiveByStreamId),
        // or update an already-linked same stream/video.
        if (
          (isLivePlaceholder && video.type === 'archive') ||
          platformId === video.id
        ) {
          toReconcile.push({
            originalVideo: video,
            savedVideo: byStream,
          })
          continue
        }
        // Real different VOD (or a non-archive matching a placeholder) already
        // owns this stream_id — skip insert to avoid unique constraint
        // violation; leave reconciliation to the matching archive / /videos/check.
        continue
      }
    }

    toInsert.push(video)
  }

  const saved: Video[] = []

  if (toReconcile.length > 0) {
    const reconcileThumbnails = await processThumbnails({
      currentDateTime,
      originalVideos: toReconcile.map((item) => item.originalVideo),
      supabaseClient,
    })

    const settled = await Promise.allSettled(
      toReconcile.map(({ originalVideo, savedVideo }) => {
        const thumbnail = reconcileThumbnails.find((t) =>
          t.path.startsWith(`${originalVideo.id}/`),
        )
        return reconcileLivePlaceholderToArchive({
          currentDateTime,
          originalVideo,
          savedVideo,
          supabaseClient,
          ...(thumbnail ? { thumbnailId: thumbnail.id } : {}),
        })
      }),
    )

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        saved.push(result.value)
      } else if (result.status === 'rejected') {
        Sentry.captureException(result.reason)
      }
    }
  }

  if (toInsert.length === 0) {
    return saved
  }

  const thumbnails = await processThumbnails({
    currentDateTime,
    originalVideos: toInsert,
    supabaseClient,
  })

  const videoData = buildNewTwitchVideoRows({
    currentDateTime,
    originalVideos: toInsert,
    talentId,
    thumbnails,
    twitchUserId,
  })

  if (videoData.length === 0) {
    return saved
  }

  const settled = await Promise.allSettled(
    videoData.map((item) =>
      insertTwitchVideoPair(supabaseClient, item.value, {
        streamId: item.streamId,
        twitchUserId: item.twitchUserId,
        twitchVideoId: item.twitchVideoId,
        type: item.type,
      }),
    ),
  )

  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value) {
      saved.push(result.value)
    } else if (result.status === 'rejected') {
      Sentry.captureException(result.reason)
    }
  }

  return saved
}
