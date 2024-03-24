import { type DefaultDatabase } from '@shinju-date/supabase'

export type SavedChannel = Pick<
  DefaultDatabase['public']['Tables']['channels']['Row'],
  'id' | 'slug'
>

export type SavedThumbnail = Omit<
  DefaultDatabase['public']['Tables']['thumbnails']['Row'],
  'created_at'
>

export type SavedVideo = Omit<
  DefaultDatabase['public']['Tables']['videos']['Row'],
  'channel_id' | 'updated_at' | 'url'
> & {
  thumbnails: SavedThumbnail | SavedThumbnail[] | null
}
