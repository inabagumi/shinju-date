import { createSupabaseClient } from '@shinju-date/supabase'

export const supabase = createSupabaseClient()

export async function* getAllChannels() {
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
