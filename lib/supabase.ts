import { createClient } from '@supabase/supabase-js'
import { type Database } from './database.types'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function getChannelBySlug(slug: string) {
  const { data: channels, error } = await supabase
    .from('channels')
    .select(
      `
        id,
        name,
        slug
      `
    )
    .eq('slug', slug)
    .limit(1)

  if (error) {
    throw error
  }

  if (!channels || channels.length < 1) {
    return null
  }

  return channels[0]
}

export async function getGroupBySlug(slug: string) {
  const { data: groups, error } = await supabase
    .from('groups')
    .select(
      `
        channels (id, name, slug),
        id,
        name,
        slug
      `
    )
    .eq('slug', slug)
    .is('channels.deleted_at', null)
    .limit(1)

  if (error) {
    throw error
  }

  if (!groups || groups.length < 1) {
    return null
  }

  return groups[0]
}
