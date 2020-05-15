import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'

import Video from 'types/video'
import parseDuration from 'utils/parse-duration'

export type VideoObject = Omit<Video, 'duration' | 'publishedAt'> & {
  duration?: string
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
  duration: parseDuration(duration || 'PT0S'),
  id,
  publishedAt: fromUnixTime(publishedAt).toJSON(),
  title,
  url
})

export default normalize
