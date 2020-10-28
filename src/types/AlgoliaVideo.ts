import type { Image, Video } from '@/types'

type AlgoliaVideo = Omit<Video, 'duration' | 'publishedAt' | 'thumbnail'> & {
  duration?: string
  publishedAt: number
  thumbnail?: Image
}

export default AlgoliaVideo
