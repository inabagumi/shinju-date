import Channel from './channel'

interface Video {
  channel: Channel
  id: string
  objectID: string
  publishedAt: number
  title: string
  url: string
}

export default Video
