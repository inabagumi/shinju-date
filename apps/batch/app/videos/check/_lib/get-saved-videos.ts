import type { TypedSupabaseClient } from '@/lib/supabase'
import type { CheckMode, SavedVideo } from './types'

export type GetSavedVideos = {
  mode: CheckMode
  supabaseClient: TypedSupabaseClient
}

export async function* getSavedVideos({
  mode,
  supabaseClient,
}: GetSavedVideos): AsyncGenerator<SavedVideo, void, undefined> {
  // For 'all' mode, fetch all videos in batches
  // For 'recent' mode, fetch only the latest 100 videos
  // For 'default' mode (no parameter), fetch only UPCOMING/LIVE videos
  if (mode === 'all') {
    const { count, error } = await supabaseClient.from('videos').select('*', {
      count: 'exact',
      head: true,
    })

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    if (!count) return

    const limit = 2000
    for (let i = 0; i < count; i += limit) {
      const { data: savedVideos, error } = await supabaseClient
        .from('videos')
        .select(
          'id, duration, published_at, status, title, video_kind, thumbnail:thumbnails (id), youtube_video:youtube_videos!inner (youtube_video_id)',
        )
        .is('deleted_at', null)
        .order('published_at', {
          ascending: false,
        })
        .range(i, i + (limit - 1))

      if (error) {
        throw new TypeError(error.message, {
          cause: error,
        })
      }

      yield* savedVideos
    }
  } else if (mode === 'recent') {
    // For 'recent' mode: fetch latest 100 videos (ENDED and PUBLISHED)
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select(
        'id, duration, published_at, status, title, video_kind, thumbnail:thumbnails (id), youtube_video:youtube_videos!inner (youtube_video_id)',
      )
      .is('deleted_at', null)
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

    yield* savedVideos
  } else {
    // For 'default' mode: fetch only UPCOMING/LIVE videos
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select(
        'id, duration, published_at, status, title, video_kind, thumbnail:thumbnails (id), youtube_video:youtube_videos!inner (youtube_video_id)',
      )
      .is('deleted_at', null)
      .in('status', ['UPCOMING', 'LIVE'])
      .order('published_at', {
        ascending: false,
      })

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    yield* savedVideos
  }
}
