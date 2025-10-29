'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import type { Temporal } from 'temporal-polyfill'
import { createSupabaseServerClient } from '@/lib/supabase'
import { _getPopularItemsFromRedis } from './_get-popular-items-from-redis'

export type PopularVideo = {
  clicks: number
  slug: string
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  title: string
  youtube_videos: {
    youtube_video_id: string
  } | null
}

export async function getPopularVideos(
  limit: number,
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<PopularVideo[]> {
  const videoScores = await _getPopularItemsFromRedis<string>(
    REDIS_KEYS.CLICK_VIDEO_PREFIX,
    limit,
    startDate,
    endDate,
  )

  if (videoScores.length === 0) {
    return []
  }

  const supabaseClient = await createSupabaseServerClient()

  const videoIds = videoScores.map(([id]) => id)
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select(
      'id, slug, thumbnails(path, blur_data_url), title, youtube_videos(youtube_video_id)',
    )
    .in('id', videoIds)

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

      return {
        clicks,
        slug: video.slug,
        thumbnail: video.thumbnails,
        title: video.title,
        youtube_videos: video.youtube_videos,
      }
    })
    .filter(isNonNullable)
}
