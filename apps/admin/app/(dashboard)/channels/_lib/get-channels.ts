import { createSupabaseServerClient } from '@/lib/supabase'

export default async function getChannels() {
  const supabaseClient = await createSupabaseServerClient()

  const { data: channels, error } = await supabaseClient
    .from('channels')
    .select(
      'id, name, created_at, updated_at, youtube_channel:youtube_channels(name, youtube_channel_id)',
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

  return channels
}
