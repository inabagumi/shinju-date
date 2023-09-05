import { type Database } from '@shinju-date/schema'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
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
