import { type Database } from '@shinju-date/schema'

export type SavedChannel = Pick<
  Database['public']['Tables']['channels']['Row'],
  'id' | 'slug'
>

export type SavedThumbnail = Omit<
  Database['public']['Tables']['thumbnails']['Row'],
  'created_at'
>

export type SavedVideo = Omit<
  Database['public']['Tables']['videos']['Row'],
  'channel_id' | 'updated_at' | 'url'
> & {
  thumbnails: SavedThumbnail | SavedThumbnail[] | null
}
