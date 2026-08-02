import type { TypedSupabaseClient } from '@/lib/supabase'
import type { CheckMode } from './types'

export interface SavedTwitchVideo {
  id: string
  duration: string
  published_at: string
  status: 'UPCOMING' | 'LIVE' | 'ENDED' | 'PUBLISHED'
  title: string
  thumbnail: { id: string } | null
  twitch_video: {
    id: string
    twitch_video_id: string
    type: 'archive' | 'highlight' | 'upload' | 'clip' | null
  }
}

export interface GetSavedTwitchVideos {
  mode: CheckMode
  supabaseClient: TypedSupabaseClient
}

const VIDEO_SELECT =
  'id, duration, published_at, status, title, thumbnail:thumbnails (id), twitch_video:twitch_videos!inner (id, twitch_video_id, type), talent:talents!inner (id, status, deleted_at)'

function toSavedTwitchVideo(row: {
  id: string
  duration: SavedTwitchVideo['duration']
  published_at: string
  status: SavedTwitchVideo['status']
  title: string
  thumbnail: { id: string } | null
  twitch_video:
    | {
        id: string
        twitch_video_id: string
        type: SavedTwitchVideo['twitch_video']['type']
      }
    | Array<{
        id: string
        twitch_video_id: string
        type: SavedTwitchVideo['twitch_video']['type']
      }>
}): SavedTwitchVideo {
  const twitchVideo = Array.isArray(row.twitch_video)
    ? row.twitch_video[0]
    : row.twitch_video

  if (!twitchVideo) {
    throw new TypeError(`Missing twitch_video for video ${row.id}`)
  }

  return {
    duration: row.duration,
    id: row.id,
    published_at: row.published_at,
    status: row.status,
    thumbnail: row.thumbnail,
    title: row.title,
    twitch_video: twitchVideo,
  }
}

/**
 * Yields saved Twitch videos for check modes.
 * - default: none (Twitch VODs are not UPCOMING/LIVE)
 * - recent: latest 100 ENDED/PUBLISHED Twitch videos for active talents
 * - all: all non-deleted Twitch videos for non-deleted talents (paginated)
 */
export async function* getSavedTwitchVideos({
  mode,
  supabaseClient,
}: GetSavedTwitchVideos): AsyncGenerator<SavedTwitchVideo, void, undefined> {
  if (mode === 'default') {
    return
  }

  if (mode === 'all') {
    const { count, error } = await supabaseClient
      .from('videos')
      .select(
        'id, talent:talents!inner (id), twitch_video:twitch_videos!inner (id)',
        {
          count: 'exact',
          head: true,
        },
      )
      .eq('platform', 'twitch')
      .is('deleted_at', null)
      .is('talent.deleted_at', null)

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    if (!count) return

    const limit = 2000
    for (let i = 0; i < count; i += limit) {
      const { data: savedVideos, error: pageError } = await supabaseClient
        .from('videos')
        .select(VIDEO_SELECT)
        .eq('platform', 'twitch')
        .is('deleted_at', null)
        .is('talent.deleted_at', null)
        .order('published_at', {
          ascending: false,
        })
        .range(i, i + (limit - 1))

      if (pageError) {
        throw new TypeError(pageError.message, {
          cause: pageError,
        })
      }

      for (const video of savedVideos) {
        yield toSavedTwitchVideo(video)
      }
    }
  } else {
    // mode === 'recent'
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select(VIDEO_SELECT)
      .eq('platform', 'twitch')
      .is('deleted_at', null)
      .is('talent.deleted_at', null)
      .eq('talent.status', 'active')
      .in('status', ['ENDED', 'PUBLISHED'])
      .order('published_at', {
        ascending: false,
      })
      .limit(100)

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    for (const video of savedVideos) {
      yield toSavedTwitchVideo(video)
    }
  }
}
