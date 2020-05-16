import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'

import Video from 'types/video'

export type VideoObject = Omit<Video, 'publishedAt'> & {
  publishedAt: number
}

const normalize = ({
  channel,
  duration,
  id,
  publishedAt,
  title,
  url
}: VideoObject & ObjectWithObjectID): Video => ({
  channel,
  duration: duration || 'PT0S',
  id,
  publishedAt: fromUnixTime(publishedAt).toJSON(),
  title,
  url
})

export default normalize
