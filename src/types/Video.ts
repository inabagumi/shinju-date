import type { Duration } from 'date-fns'

import type { Channel, Image } from '@/types'

type Video = {
  channel: Channel
  duration?: Duration
  id: string
  publishedAt: Date
  thumbnails: Image[]
  title: string
  url: string
}

export default Video
