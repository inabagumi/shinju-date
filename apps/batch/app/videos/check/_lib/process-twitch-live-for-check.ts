import { toDBString } from '@shinju-date/temporal-fns'
import type { TwitchStream, TwitchVideo } from '@shinju-date/twitch-api-client'
import { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from '@/lib/supabase'
import type { SavedTwitchVideo } from './get-saved-twitch-videos'

export interface TwitchLiveVideoUpdate {
  id: string
  duration?: string
  published_at?: string
  status: 'LIVE' | 'ENDED'
  title?: string
  updated_at: string
}

export interface TwitchLivePlatformUpdate {
  id: string
  stream_id: string | null
  twitch_video_id: string
  type: 'archive' | 'highlight' | 'upload' | 'clip'
}

/**
 * Reconciles saved LIVE Twitch rows against Helix Streams (+ optional archives).
 *
 * - Stream still live → keep LIVE; update title if changed
 * - Stream offline → set ENDED (row kept with synthetic id until VOD arrives)
 * - Matching archive provided → promote synthetic id to real VOD id + archive type
 *
 * Returns whether any DB write occurred.
 */
export async function processTwitchLiveForCheck({
  archives = [],
  currentDateTime,
  logger,
  liveStreams,
  savedVideos,
  supabaseClient,
}: {
  /** Recent archives that may complete LIVE → ENDED with real VOD ids */
  archives?: TwitchVideo[]
  currentDateTime: Temporal.Instant
  logger: {
    info: (message: string, attributes?: Record<string, unknown>) => void
  }
  liveStreams: TwitchStream[]
  savedVideos: SavedTwitchVideo[]
  supabaseClient: TypedSupabaseClient
}): Promise<boolean> {
  if (savedVideos.length === 0) {
    return false
  }

  const liveByStreamId = new Map(
    liveStreams.map((stream) => [stream.id, stream]),
  )
  const archiveByStreamId = new Map<string, TwitchVideo>()
  for (const archive of archives) {
    if (archive.stream_id && archive.type === 'archive') {
      archiveByStreamId.set(archive.stream_id, archive)
    }
  }

  const videoUpdates: TwitchLiveVideoUpdate[] = []
  const platformUpdates: TwitchLivePlatformUpdate[] = []

  for (const saved of savedVideos) {
    if (saved.status !== 'LIVE') {
      continue
    }

    const streamId = saved.twitch_video.stream_id
    if (!streamId) {
      // LIVE without stream_id is unexpected; end it to avoid stuck LIVE cards.
      videoUpdates.push({
        id: saved.id,
        status: 'ENDED',
        updated_at: toDBString(currentDateTime),
      })
      continue
    }

    const stillLive = liveByStreamId.get(streamId)
    const archive = archiveByStreamId.get(streamId)

    if (archive) {
      const publishedAt = Temporal.Instant.from(
        archive.published_at || archive.created_at,
      )
      videoUpdates.push({
        duration: archive.duration,
        id: saved.id,
        published_at: toDBString(publishedAt),
        status: 'ENDED',
        title: archive.title,
        updated_at: toDBString(currentDateTime),
      })
      platformUpdates.push({
        id: saved.twitch_video.id,
        stream_id: archive.stream_id,
        twitch_video_id: archive.id,
        type: archive.type,
      })
      continue
    }

    if (stillLive) {
      if (saved.title !== stillLive.title) {
        videoUpdates.push({
          id: saved.id,
          status: 'LIVE',
          title: stillLive.title,
          updated_at: toDBString(currentDateTime),
        })
      }
      continue
    }

    // Stream offline and no archive yet: drop LIVE badge, keep row for reconcile.
    videoUpdates.push({
      id: saved.id,
      status: 'ENDED',
      updated_at: toDBString(currentDateTime),
    })
  }

  if (videoUpdates.length === 0 && platformUpdates.length === 0) {
    return false
  }

  if (videoUpdates.length > 0) {
    const results = await Promise.all(
      videoUpdates.map((update) => {
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

    logger.info('Twitch LIVE動画が更新されました', {
      count: videoUpdates.length,
    })
  }

  if (platformUpdates.length > 0) {
    const results = await Promise.all(
      platformUpdates.map((update) =>
        supabaseClient
          .from('twitch_videos')
          .update({
            stream_id: update.stream_id,
            twitch_video_id: update.twitch_video_id,
            type: update.type,
          })
          .eq('id', update.id),
      ),
    )

    const firstError = results.find((result) => result.error)
    if (firstError?.error) {
      throw new TypeError(firstError.error.message, {
        cause: firstError.error,
      })
    }

    logger.info('Twitch LIVE行がアーカイブに紐づけられました', {
      count: platformUpdates.length,
    })
  }

  return true
}
