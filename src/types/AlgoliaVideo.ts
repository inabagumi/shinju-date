import type { Video } from '@/types'

type AlgoliaVideo = Omit<Video, 'publishedAt'> & {
  publishedAt: number
}

export default AlgoliaVideo
