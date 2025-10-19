import { TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'

export type PopularVideo = {
  slug: string
  title: string
  clicks: number
  thumbnail: {
    path: string
    blur_data_url: string
  } | null
}

export async function getPopularVideos(limit = 10): Promise<PopularVideo[]> {
  // Get today's date in JST timezone
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const keySuffix = formatDate(today)

  // Fetch top videos by click count from Upstash
  const topVideos = await redisClient.zrange<string[]>(
    `videos:clicked:${keySuffix}`,
    0,
    limit - 1,
    {
      rev: true,
      withScores: true,
    },
  )

  if (!topVideos || topVideos.length === 0) {
    return []
  }

  // Parse the results - format is [slug1, score1, slug2, score2, ...]
  const videoData: Array<{ slug: string; clicks: number }> = []
  for (let i = 0; i < topVideos.length; i += 2) {
    videoData.push({
      clicks: Number(topVideos[i + 1]),
      slug: topVideos[i] as string,
    })
  }

  // Get video details from Supabase
  const videoSlugs = videoData.map((v) => v.slug)
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select('slug, title, thumbnails(path, blur_data_url)')
    .in('slug', videoSlugs)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  if (!videos) {
    return []
  }

  // Combine video data with click counts, maintaining order
  const popularVideos: PopularVideo[] = videoData
    .map((data) => {
      const video = videos.find((v) => v.slug === data.slug)
      if (!video) return null

      return {
        clicks: data.clicks,
        slug: video.slug,
        thumbnail: video.thumbnails,
        title: video.title,
      }
    })
    .filter((v): v is PopularVideo => v !== null)

  return popularVideos
}
