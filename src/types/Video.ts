import type { Duration } from 'date-fns'

import type { Channel } from '@/types'

type Video = {
  channel: Channel
  duration?: Duration
  id: string
  publishedAt: Date
  title: string
  url: string
}

export default Video
