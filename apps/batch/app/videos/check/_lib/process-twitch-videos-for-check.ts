import { toDBString } from '@shinju-date/temporal-fns'
import type { TwitchClip, TwitchVideo } from '@shinju-date/twitch-api-client'
import { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from '@/lib/supabase'
import type { SavedTwitchVideo } from './get-saved-twitch-videos'

export type TwitchVideoUpdate = {
  id: string
  duration: string
  published_at: string
  status: 'UPCOMING' | 'LIVE' | 'ENDED' | 'PUBLISHED'
  title: string
  updated_at: string
}

export type TwitchTypeUpdate = {
  id: string
  type: 'archive' | 'highlight' | 'upload' | 'clip'
}

function getStatusForTwitchType(
  type: 'archive' | 'highlight' | 'upload' | 'clip',
): 'ENDED' | 'PUBLISHED' {
  return type === 'upload' || type === 'clip' ? 'PUBLISHED' : 'ENDED'
}

function getVideoUpdateIfNeeded({
  currentDateTime,
  nextDuration,
  nextPublishedAt,
  nextStatus,
  nextTitle,
  savedVideo,
}: {
  currentDateTime: Temporal.Instant
  nextDuration: string
  nextPublishedAt: Temporal.Instant
  nextStatus: 'ENDED' | 'PUBLISHED'
  nextTitle: string
  savedVideo: SavedTwitchVideo
}): TwitchVideoUpdate | null {
  let hasUpdate = false
  let duration = savedVideo.duration
  let publishedAt = savedVideo.published_at
  let status = savedVideo.status
  let title = savedVideo.title

  if (savedVideo.status !== nextStatus) {
    status = nextStatus
    hasUpdate = true
  }

  if (savedVideo.duration !== nextDuration) {
    duration = nextDuration
    hasUpdate = true
  }

  const savedPublishedAt = Temporal.Instant.from(savedVideo.published_at)
  if (!savedPublishedAt.equals(nextPublishedAt)) {
    publishedAt = toDBString(nextPublishedAt)
    hasUpdate = true
  }

  if (savedVideo.title !== nextTitle) {
    title = nextTitle
    hasUpdate = true
  }

  if (!hasUpdate) {
    return null
  }

  return {
    duration,
    id: savedVideo.id,
    published_at: publishedAt,
    status,
    title,
    updated_at: toDBString(currentDateTime),
  }
}

async function batchUpdateVideos({
  updates,
  supabaseClient,
}: {
  updates: TwitchVideoUpdate[]
  supabaseClient: TypedSupabaseClient
}): Promise<number> {
  if (updates.length === 0) {
    return 0
  }

  const results = await Promise.all(
    updates.map((update) => {
      const { id, ...updateData } = update
      return supabaseClient.from('videos').update(updateData).eq('id', id)
    }),
  )

  const firstError = results.find((result) => result.error)
  if (firstError?.error) {
    throw new TypeError(firstError.error.message, {
      cause: firstError.error,
    })
  }

  return updates.length
}

async function batchUpdateTwitchTypes({
  updates,
  supabaseClient,
}: {
  updates: TwitchTypeUpdate[]
  supabaseClient: TypedSupabaseClient
}): Promise<void> {
  if (updates.length === 0) {
    return
  }

  const results = await Promise.all(
    updates.map((update) =>
      supabaseClient
        .from('twitch_videos')
        .update({ type: update.type })
        .eq('id', update.id),
    ),
  )

  const firstError = results.find((result) => result.error)
  if (firstError?.error) {
    throw new TypeError(firstError.error.message, {
      cause: firstError.error,
    })
  }
}

async function softDeleteRows({
  currentDateTime,
  ids,
  supabaseClient,
  table,
}: {
  currentDateTime: Temporal.Instant
  ids: string[]
  supabaseClient: TypedSupabaseClient
  table: 'videos' | 'thumbnails'
}): Promise<{ id: string }[]> {
  const timestamp = toDBString(currentDateTime)

  if (table === 'videos') {
    const { data, error } = await supabaseClient
      .from('videos')
      .update({
        deleted_at: timestamp,
        deleted_reason: 'unavailable',
        updated_at: timestamp,
      })
      .in('id', ids)
      .select('id')

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    return data
  }

  const { data, error } = await supabaseClient
    .from('thumbnails')
    .update({
      deleted_at: timestamp,
      updated_at: timestamp,
    })
    .in('id', ids)
    .select('id')

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return data
}

/**
 * Updates saved Twitch videos from Helix video/clip payloads and soft-deletes
 * rows that are no longer available on Twitch.
 */
export async function processTwitchVideosForCheck({
  clips,
  currentDateTime,
  logger,
  mode,
  savedVideos,
  supabaseClient,
  videos,
}: {
  clips: TwitchClip[]
  currentDateTime: Temporal.Instant
  logger: {
    info: (message: string, attributes?: Record<string, unknown>) => void
  }
  mode: string
  savedVideos: SavedTwitchVideo[]
  supabaseClient: TypedSupabaseClient
  videos: TwitchVideo[]
}): Promise<boolean> {
  const videoUpdates: TwitchVideoUpdate[] = []
  const typeUpdates: TwitchTypeUpdate[] = []
  const availableIds = new Set<string>()

  for (const originalVideo of videos) {
    availableIds.add(originalVideo.id)

    const savedVideo = savedVideos.find(
      (v) => v.twitch_video.twitch_video_id === originalVideo.id,
    )
    if (!savedVideo) {
      continue
    }

    const nextPublishedAt = Temporal.Instant.from(
      originalVideo.published_at || originalVideo.created_at,
    )
    const nextStatus = getStatusForTwitchType(originalVideo.type)

    const updateData = getVideoUpdateIfNeeded({
      currentDateTime,
      nextDuration: originalVideo.duration,
      nextPublishedAt,
      nextStatus,
      nextTitle: originalVideo.title,
      savedVideo,
    })

    if (updateData) {
      videoUpdates.push(updateData)
    }

    if (savedVideo.twitch_video.type !== originalVideo.type) {
      typeUpdates.push({
        id: savedVideo.twitch_video.id,
        type: originalVideo.type,
      })
    }
  }

  for (const clip of clips) {
    availableIds.add(clip.id)

    const savedVideo = savedVideos.find(
      (v) => v.twitch_video.twitch_video_id === clip.id,
    )
    if (!savedVideo) {
      continue
    }

    const nextPublishedAt = Temporal.Instant.from(clip.created_at)
    const nextStatus = getStatusForTwitchType('clip')

    const updateData = getVideoUpdateIfNeeded({
      currentDateTime,
      nextDuration: clip.duration,
      nextPublishedAt,
      nextStatus,
      nextTitle: clip.title,
      savedVideo,
    })

    if (updateData) {
      videoUpdates.push(updateData)
    }

    if (savedVideo.twitch_video.type !== 'clip') {
      typeUpdates.push({
        id: savedVideo.twitch_video.id,
        type: 'clip',
      })
    }
  }

  if (videoUpdates.length > 0) {
    await batchUpdateVideos({
      supabaseClient,
      updates: videoUpdates,
    })

    logger.info('Twitch動画が更新されました', {
      count: videoUpdates.length,
      mode,
    })
  }

  if (typeUpdates.length > 0) {
    await batchUpdateTwitchTypes({
      supabaseClient,
      updates: typeUpdates,
    })
  }

  const videoIdsToDelete: string[] = []
  const thumbnailIdsToDelete: string[] = []

  for (const savedVideo of savedVideos) {
    const twitchVideoId = savedVideo.twitch_video.twitch_video_id
    if (availableIds.has(twitchVideoId)) {
      continue
    }

    videoIdsToDelete.push(savedVideo.id)

    if (savedVideo.thumbnail) {
      thumbnailIdsToDelete.push(savedVideo.thumbnail.id)
    }

    logger.info('Twitch動画を削除しました', {
      videoId: twitchVideoId,
    })
  }

  if (videoIdsToDelete.length > 0) {
    try {
      await Promise.all([
        softDeleteRows({
          currentDateTime,
          ids: videoIdsToDelete,
          supabaseClient,
          table: 'videos',
        }),
        thumbnailIdsToDelete.length > 0
          ? softDeleteRows({
              currentDateTime,
              ids: thumbnailIdsToDelete,
              supabaseClient,
              table: 'thumbnails',
            })
          : Promise.resolve(),
      ])

      logger.info('Twitch動画が削除されました', {
        count: videoIdsToDelete.length,
      })
    } catch (error) {
      throw new Error('Failed to delete Twitch videos.', {
        cause: error,
      })
    }
  }

  return (
    videoUpdates.length > 0 ||
    typeUpdates.length > 0 ||
    videoIdsToDelete.length > 0
  )
}
