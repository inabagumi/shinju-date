import type { Duration } from 'date-fns'

import type Channel from '@/types/Channel'
import type Image from '@/types/Image'

type Video = {
  channel: Channel
  duration?: Duration
  id: string
  publishedAt: Date
  thumbnail: Image
  title: string
  url: string
}

export default Video
