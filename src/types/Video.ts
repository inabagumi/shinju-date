import type { Duration } from 'date-fns'

import type { Channel, Image } from '@/types'

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
