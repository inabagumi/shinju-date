import { createClient } from '@supabase/supabase-js'

export type Channel = {
  id: string
  name: string
  slug: string
}

export type Group = {
  channels: Channel[]
  id: number
  name: string
  slug: string
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function getChannelBySlug(slug: string): Promise<Channel | null> {
  const { data: channels, error } = await supabase
    .from<Channel>('channels')
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

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  const { data: groups, error } = await supabase
    .from<Group>('groups')
    .select(
      `
        channels (id, name, slug),
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

  if (!groups || groups.length < 1) {
    return null
  }

  return groups[0]
}
