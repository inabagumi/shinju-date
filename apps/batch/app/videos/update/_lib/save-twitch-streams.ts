import * as Sentry from '@sentry/nextjs'
import type { TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { TwitchStream } from '@shinju-date/twitch-api-client'
import {
  isLiveTwitchVideoId,
  streamIdFromLiveTwitchVideoId,
  toLiveTwitchVideoId,
} from '@shinju-date/twitch-api-client'
import PQueue from 'p-queue'
import { Temporal } from 'temporal-polyfill'
import {
  DatabaseError,
  getSavedTwitchVideos,
  getSavedTwitchVideosByStreamIds,
} from '@/lib/database/operations'
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

async function processStreamThumbnails(options: {
  currentDateTime?: Temporal.Instant
  streams: TwitchStream[]
  supabaseClient: TypedSupabaseClient
}): Promise<{ id: string; path: string }[]> {
  const queue = new PQueue({
    concurrency: 12,
    interval: 250,
  })

  const results = await Promise.allSettled(
    options.streams.map((stream) =>
      queue.add(() =>
        ImageProcessor.uploadFromUrl({
          currentDateTime: options.currentDateTime ?? Temporal.Now.instant(),
          // Use synthetic live id so path stays stable until VOD reconcile.
          mediaId: toLiveTwitchVideoId(stream.id),
          supabaseClient: options.supabaseClient,
          thumbnailUrl: stream.thumbnail_url,
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

async function insertLiveTwitchVideoPair(
  supabaseClient: TypedSupabaseClient,
  value: TablesInsert<'videos'>,
  twitchEntry: {
    streamId: string
    twitchUserId: string
    twitchVideoId: string
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
      type: null,
      video_id: insertedVideo.id,
    })

  if (twitchError) {
    Sentry.captureException(new DatabaseError(twitchError))
    await supabaseClient.from('videos').delete().eq('id', insertedVideo.id)
    return null
  }

  return {
    ...insertedVideo,
    twitch_video: {
      stream_id: twitchEntry.streamId,
      twitch_video_id: twitchEntry.twitchVideoId,
      type: null,
    },
  }
}

/**
 * Upsert LIVE rows for currently broadcasting Twitch streams.
 *
 * Idempotency:
 * - Matches existing rows by `stream_id` or synthetic `live:{stream_id}` id
 * - Updates title (and keeps status LIVE) when already present
 * - Inserts a new video + twitch_videos pair otherwise
 */
export async function saveTwitchStreams(options: {
  currentDateTime: Temporal.Instant
  streams: TwitchStream[]
  supabaseClient: TypedSupabaseClient
  /** Helix user id → { talentId, twitchUserRowId } */
  userToTalentMap: Map<
    string,
    {
      talentId: string
      twitchUserRowId: string
    }
  >
}): Promise<Video[]> {
  const { currentDateTime, streams, supabaseClient, userToTalentMap } = options

  if (streams.length === 0) {
    return []
  }

  const streamIds = streams.map((stream) => stream.id)
  const syntheticIds = streamIds.map(toLiveTwitchVideoId)

  const [byStreamId, bySyntheticId] = await Promise.all([
    Array.fromAsync(getSavedTwitchVideosByStreamIds(supabaseClient, streamIds)),
    Array.fromAsync(getSavedTwitchVideos(supabaseClient, syntheticIds)),
  ])

  const existingByStreamId = new Map<string, (typeof byStreamId)[number]>()
  for (const saved of [...byStreamId, ...bySyntheticId]) {
    const platformId = saved.twitch_video?.twitch_video_id
    const streamId =
      saved.twitch_video?.stream_id ??
      (platformId && isLiveTwitchVideoId(platformId)
        ? streamIdFromLiveTwitchVideoId(platformId)
        : null)
    if (streamId && !existingByStreamId.has(streamId)) {
      existingByStreamId.set(streamId, saved)
    }
  }

  const newStreams: TwitchStream[] = []
  const titleUpdates: Array<{
    id: string
    title: string
  }> = []

  for (const stream of streams) {
    const existing = existingByStreamId.get(stream.id)
    if (existing) {
      if (existing.deleted_at) {
        // Soft-deleted placeholder — treat as new insert path is not used;
        // skip to avoid resurrecting without explicit restore logic.
        continue
      }

      if (existing.status !== 'LIVE' || existing.title !== stream.title) {
        titleUpdates.push({
          id: existing.id,
          title: stream.title,
        })
      }
      continue
    }

    if (!userToTalentMap.has(stream.user_id)) {
      continue
    }

    newStreams.push(stream)
  }

  const saved: Video[] = []

  if (titleUpdates.length > 0) {
    const results = await Promise.all(
      titleUpdates.map((update) =>
        supabaseClient
          .from('videos')
          .update({
            status: 'LIVE',
            title: update.title,
            updated_at: toDBString(currentDateTime),
          })
          .eq('id', update.id)
          .select(scrapeResultSelect)
          .single(),
      ),
    )

    for (const result of results) {
      if (result.error) {
        Sentry.captureException(new DatabaseError(result.error))
        continue
      }
      if (result.data) {
        saved.push(result.data)
      }
    }
  }

  if (newStreams.length === 0) {
    return saved
  }

  const thumbnails = await processStreamThumbnails({
    currentDateTime,
    streams: newStreams,
    supabaseClient,
  })

  const settled = await Promise.allSettled(
    newStreams.map(async (stream) => {
      const talentInfo = userToTalentMap.get(stream.user_id)
      if (!talentInfo) {
        return null
      }

      const liveVideoId = toLiveTwitchVideoId(stream.id)
      const thumbnail = thumbnails.find((t) =>
        t.path.startsWith(`${liveVideoId}/`),
      )
      const startedAt = Temporal.Instant.from(stream.started_at)

      return insertLiveTwitchVideoPair(
        supabaseClient,
        {
          created_at: toDBString(currentDateTime),
          duration: 'P0D',
          platform: 'twitch',
          published_at: toDBString(startedAt),
          status: 'LIVE',
          talent_id: talentInfo.talentId,
          title: stream.title,
          updated_at: toDBString(currentDateTime),
          video_kind: 'standard',
          visible: true,
          ...(thumbnail ? { thumbnail_id: thumbnail.id } : {}),
        },
        {
          streamId: stream.id,
          twitchUserId: talentInfo.twitchUserRowId,
          twitchVideoId: liveVideoId,
        },
      )
    }),
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
