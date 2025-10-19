import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { isNonNullable } from '@shinju-date/helpers'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'

export type PopularVideo = {
  clicks: number
  slug: string
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
  title: string
}

export async function getPopularVideos(
  limit = 10,
  days = 7,
): Promise<PopularVideo[]> {
  // Get today's date in JST timezone
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const videoClicks = new Map<number, number>()

  // Aggregate clicks from the past N days
  for (let i = 0; i < days; i++) {
    const date = today.subtract({ days: i })
    const dateKey = formatDate(date)
    const key = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`

    const results = await redisClient.zrange<string[]>(key, 0, -1, {
      rev: false,
      withScores: true,
    })

    // Parse results: [videoId1, score1, videoId2, score2, ...]
    for (let j = 0; j < results.length; j += 2) {
      const videoIdStr = results[j]
      const scoreStr = results[j + 1]

      if (!videoIdStr || !scoreStr) continue

      const videoId = Number.parseInt(videoIdStr, 10)
      const score = Number.parseInt(scoreStr, 10)

      videoClicks.set(videoId, (videoClicks.get(videoId) ?? 0) + score)
    }
  }

  // Sort by clicks and get top N
  const sortedVideos = Array.from(videoClicks.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  if (sortedVideos.length === 0) {
    return []
  }

  // Fetch video details from Supabase
  const videoIds = sortedVideos.map(([id]) => id)
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select('id, slug, thumbnails(path, blur_data_url), title')
    .in('id', videoIds)

  if (error) {
    console.error('Failed to fetch video details:', error)

    return []
  }

  // Map videos with their click counts
  const videoMap = new Map(videos.map((v) => [v.id, v]))

  return sortedVideos
    .map(([id, clicks]) => {
      const video = videoMap.get(id)

      if (!video) return null

      return {
        clicks,
        slug: video.slug,
        thumbnail: video.thumbnails,
        title: video.title,
      }
    })
    .filter(isNonNullable)
}
