import type { Image } from '@/types'

type AlgoliaImage = Omit<Image, 'srcSet' | 'preSrc'> & {
  preSrc?: string
}

export default AlgoliaImage
