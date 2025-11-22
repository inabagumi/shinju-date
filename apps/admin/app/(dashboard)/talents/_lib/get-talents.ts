import { createSupabaseServerClient } from '@/lib/supabase'

export async function getTalents() {
  const supabaseClient = await createSupabaseServerClient()

  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, name, created_at, updated_at, youtube_channels(id, name, youtube_channel_id, youtube_handle)',
    )
    .is('deleted_at', null)
    .order('name', {
      ascending: true,
    })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return talents
}
