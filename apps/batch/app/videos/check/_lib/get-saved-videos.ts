import type { TypedSupabaseClient } from '@/lib/supabase'
import type { CheckMode, SavedVideo } from './types'

export type GetSavedVideos = {
  mode: CheckMode
  supabaseClient: TypedSupabaseClient
}

const VIDEO_SELECT =
  'id, duration, published_at, status, title, video_kind, thumbnail:thumbnails (id), youtube_video:youtube_videos!inner (youtube_video_id), talent:talents!inner (id, status, deleted_at)'

function toSavedVideo(row: {
  id: string
  duration: SavedVideo['duration']
  published_at: string
  status: SavedVideo['status']
  title: string
  thumbnail: { id: string } | null
  youtube_video: { youtube_video_id: string }
}): SavedVideo {
  return {
    duration: row.duration,
    id: row.id,
    published_at: row.published_at,
    status: row.status,
    thumbnail: row.thumbnail,
    title: row.title,
    youtube_video: row.youtube_video,
  }
}

export async function* getSavedVideos({
  mode,
  supabaseClient,
}: GetSavedVideos): AsyncGenerator<SavedVideo, void, undefined> {
  // High-frequency modes (default/recent): active talents only.
  // mode=all: active + retired (deleted talents excluded) for low-frequency deletion checks.
  if (mode === 'all') {
    const { count, error } = await supabaseClient
      .from('videos')
      .select(
        'id, talent:talents!inner (id), youtube_video:youtube_videos!inner (youtube_video_id)',
        {
          count: 'exact',
          head: true,
        },
      )
      .eq('platform', 'youtube')
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
        .eq('platform', 'youtube')
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
        yield toSavedVideo(video)
      }
    }
  } else if (mode === 'recent') {
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select(VIDEO_SELECT)
      .eq('platform', 'youtube')
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
      yield toSavedVideo(video)
    }
  } else {
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select(VIDEO_SELECT)
      .eq('platform', 'youtube')
      .is('deleted_at', null)
      .is('talent.deleted_at', null)
      .eq('talent.status', 'active')
      .in('status', ['UPCOMING', 'LIVE'])
      .order('published_at', {
        ascending: false,
      })

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    for (const video of savedVideos) {
      yield toSavedVideo(video)
    }
  }
}
