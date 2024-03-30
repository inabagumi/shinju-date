import { type DefaultDatabase } from '@shinju-date/supabase'
import {
  type SupabaseClient,
  createClient as createSupabaseClient
} from '@supabase/supabase-js'

function createClient(
  url = process.env['NEXT_PUBLIC_SUPABASE_URL'],
  key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
): SupabaseClient<DefaultDatabase> {
  if (!url || !key) {
    throw new TypeError('')
  }

  return createSupabaseClient<DefaultDatabase>(url, key)
}

export const supabaseClient = createClient()

export async function* getAllChannels() {
  const { data, error } = await supabaseClient
    .from('channels')
    .select('id, name, slug')
    .order('created_at', {
      ascending: true
    })

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  for (const channel of data ?? []) {
    yield channel
  }
}

export async function getChannelBySlug(slug: string) {
  const { data: channel, error } = await supabaseClient
    .from('channels')
    .select('id, name, slug')
    .eq('slug', slug)

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  return channel[0] ?? null
}
