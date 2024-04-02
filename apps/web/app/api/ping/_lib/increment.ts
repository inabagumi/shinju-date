import { redisClient } from '@/lib/redis'
import { type Video } from './types'

export default async function increment(video: Video): Promise<void> {
  const multi = redisClient.multi()

  multi.zincrby('videos:clicked', 1, video.id)
  multi.zincrby('channels:clicked', 1, video.channel.id)

  await multi.exec()
}
