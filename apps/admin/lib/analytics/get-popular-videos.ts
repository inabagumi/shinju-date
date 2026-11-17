'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import type { QueryData } from '@supabase/supabase-js'
import { cacheLife } from 'next/cache'
import { isNonNullable } from '@/lib/is-non-nullable'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'
import { getPopularItems } from './popular-items'

const POPULAR_VIDEO_SELECT = `
  id,
  platform,
  status,
  thumbnail:thumbnails (id, path, blur_data_url),
  title,
  youtube_video:youtube_videos (youtube_video_id),
  twitch_video:twitch_videos (
    twitch_video_id,
    type,
    twitch_user:twitch_users (twitch_login_name)
  )
`

function selectPopularVideos(
  supabaseClient: TypedSupabaseClient,
  videoIds: string[],
) {
  return supabaseClient
    .from('videos')
    .select(POPULAR_VIDEO_SELECT)
    .in('id', videoIds)
}

type PopularVideoRow = QueryData<ReturnType<typeof selectPopularVideos>>[number]

export interface PopularVideo extends PopularVideoRow {
  clicks: number
}

export async function getPopularVideos(
  limit: number,
  startDate: string,
  endDate?: string,
): Promise<PopularVideo[]> {
  'use cache: private'

  cacheLife('minutes')

  const videoScores = await getPopularItems(
    REDIS_KEYS.CLICK_VIDEO_PREFIX,
    limit,
    Temporal.PlainDate.from(startDate),
    endDate ? Temporal.PlainDate.from(endDate) : undefined,
  )

  if (videoScores.length === 0) {
    return []
  }

  const supabaseClient = await createSupabaseServerClient()

  const videoIds = videoScores.map(([id]) => id)
  const { data: videos, error } = await selectPopularVideos(
    supabaseClient,
    videoIds,
  )

  if (error) {
    logger.error('動画の詳細取得に失敗しました', {
      error,
      videoIds: videoIds.join(','),
    })

    return []
  }

  const videoMap = new Map(videos.map((v) => [v.id, v]))

  return videoScores
    .map(([id, clicks]) => {
      const video = videoMap.get(id)
      if (!video) return null

      return { ...video, clicks }
    })
    .filter(isNonNullable)
}
