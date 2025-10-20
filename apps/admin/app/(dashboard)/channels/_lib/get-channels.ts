import { cookies } from 'next/headers'
import { createSupabaseClient } from '@/lib/supabase'

export default async function getChannels() {
  const cookieStore = await cookies()
  const supabaseClient = createSupabaseClient({
    cookieStore,
  })

  const { data: channels, error } = await supabaseClient
    .from('channels')
    .select('id, name, slug, created_at, updated_at')
    .is('deleted_at', null)
    .order('name', {
      ascending: true,
    })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return channels
}
