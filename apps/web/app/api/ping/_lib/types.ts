import { type Tables } from '@shinju-date/database'

export type Video = Pick<Tables<'videos'>, 'id' | 'slug' | 'title'> & {
  channels: Pick<Tables<'channels'>, 'id' | 'name' | 'slug'>
}
