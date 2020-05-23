import type { Video } from '@/types'

type AlgoliaVideo = Omit<Video, 'duration' | 'publishedAt'> & {
  duration?: string
  publishedAt: number
}

export default AlgoliaVideo
