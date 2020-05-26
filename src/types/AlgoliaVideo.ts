import type { AlgoliaImage, Video } from '@/types'

type AlgoliaVideo = Omit<Video, 'duration' | 'publishedAt' | 'thumbnail'> & {
  duration?: string
  publishedAt: number
  thumbnail?: AlgoliaImage
}

export default AlgoliaVideo
