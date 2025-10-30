import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase'

export type Channel = {
  id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  youtube_channel: {
    youtube_channel_id: string
  } | null
}

const getChannel = cache(async function getChannel(
  id: string,
): Promise<Channel | null> {
  const supabaseClient = await createSupabaseServerClient()

  const { data: channel, error } = await supabaseClient
    .from('channels')
    .select(
      'id, name, created_at, updated_at, deleted_at, youtube_channel:youtube_channels(youtube_channel_id)',
    )
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
})

export default getChannel
