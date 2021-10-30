import type Image from './Image'
import type Video from './Video'

type AlgoliaVideo = Omit<Video, 'duration' | 'publishedAt' | 'thumbnail'> & {
  duration?: string
  publishedAt: number
  thumbnail?: Image
}

export default AlgoliaVideo
