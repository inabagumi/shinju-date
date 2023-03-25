import { type Database } from '@shinju-date/schema'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    global: {
      fetch(input, init = {}) {
        return fetch(input, {
          next: {
            revalidate: 60
          },
          ...init
        })
      }
    }
  }
)

export type Channel = Pick<
  Database['public']['Tables']['channels']['Row'],
  'id' | 'name' | 'slug'
>

export async function* getAllChannels(): AsyncGenerator<Channel, void, void> {
  const { data, error } = await supabase
    .from('channels')
    .select('id, name, slug')
    .order('created_at', {
      ascending: true
    })

  if (error) {
    throw error
  }

  for (const channel of data ?? []) {
    yield channel
  }
}

export type Group = Pick<
  Database['public']['Tables']['groups']['Row'],
  'id' | 'name' | 'slug' | 'short_name'
>

export async function* getAllGroups(): AsyncGenerator<Group, void, void> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, slug, short_name')
    .order('created_at', {
      ascending: true
    })

  if (error) {
    throw error
  }

  for (const group of data ?? []) {
    yield group
  }
}

export async function getChannelBySlug(slug: string) {
  const { data: channel, error } = await supabase
    .from('channels')
    .select('id, name, slug')
    .eq('slug', slug)

  if (error) {
    throw error
  }

  return channel[0] ?? null
}

export function getChannelsByGroup(
  group: Awaited<ReturnType<typeof getGroupBySlug>>
) {
  return group?.channels
    ? Array.isArray(group.channels)
      ? group.channels
      : [group.channels]
    : []
}

export async function getGroupBySlug(slug: string) {
  const { data: group, error } = await supabase
    .from('groups')
    .select('channels (id, name, slug), id, name, slug, short_name')
    .eq('slug', slug)

  if (error) {
    throw error
  }

  return group[0] ?? null
}
