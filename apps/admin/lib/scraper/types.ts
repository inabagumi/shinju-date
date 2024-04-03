import { type Tables } from '@shinju-date/database'

export type SavedChannel = Pick<Tables<'channels'>, 'id' | 'slug'>

export type SavedThumbnail = Omit<Tables<'thumbnails'>, 'created_at'>

export type SavedVideo = Omit<
  Tables<'videos'>,
  'channel_id' | 'updated_at' | 'url'
> & {
  thumbnails: SavedThumbnail | SavedThumbnail[] | null
}
