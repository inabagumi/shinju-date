import { Tables } from '@shinju-date/supabase'

export type Video = Pick<Tables<'videos'>, 'id' | 'slug' | 'title'> & {
  channel: Pick<Tables<'channels'>, 'id' | 'name' | 'slug'>
}
