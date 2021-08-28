import type Image from '@/types/Image'
import type Video from '@/types/Video'

type AlgoliaVideo = Omit<Video, 'duration' | 'publishedAt' | 'thumbnail'> & {
  duration?: string
  publishedAt: number
  thumbnail: Image
}

export default AlgoliaVideo
