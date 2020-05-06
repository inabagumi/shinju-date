import { Duration } from 'date-fns'

import Channel from 'types/channel'

interface Video {
  channel: Channel
  duration: Duration
  id: string
  publishedAt: string
  title: string
  url: string
}

export default Video
