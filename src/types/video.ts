import Channel from './channel'

interface Video {
  channel: Channel
  duration: string
  id: string
  publishedAt: number
  title: string
  url: string
}

export default Video
