import { REDIS_KEYS } from '@shinju-date/constants'
import { redisClient } from '@/lib/redis'

export async function getLastVideoSync(): Promise<string | null> {
  try {
    const timestamp = await redisClient.get<string>(REDIS_KEYS.LAST_VIDEO_SYNC)
    return timestamp
  } catch (error) {
    console.error('Failed to fetch last video sync timestamp:', error)
    return null
  }
}
