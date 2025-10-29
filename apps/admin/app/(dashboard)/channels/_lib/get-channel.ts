import { createSupabaseServerClient } from '@/lib/supabase'

export type Channel = {
  id: number
  name: string
  slug: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export default async function getChannel(id: number): Promise<Channel | null> {
  const supabaseClient = await createSupabaseServerClient()

  const { data: channel, error } = await supabaseClient
    .from('channels')
    .select('id, name, slug, created_at, updated_at, deleted_at')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found
      return null
    }
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return channel
}
