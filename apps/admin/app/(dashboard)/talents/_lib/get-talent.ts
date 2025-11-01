import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase'

export type Talent = {
  id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  youtube_channel: {
    name: string | null
    youtube_channel_id: string
  } | null
}

export const getTalent = cache(async function getTalent(
  id: string,
): Promise<Talent | null> {
  const supabaseClient = await createSupabaseServerClient()

  const { data: talent, error } = await supabaseClient
    .from('channels')
    .select(
      'id, name, created_at, updated_at, deleted_at, youtube_channel:youtube_channels(name, youtube_channel_id)',
    )
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found
      return null
    }
    // Check for invalid UUID format error
    if (
      error.message?.includes('invalid input syntax for type uuid') ||
      error.code === '22P02'
    ) {
      // Invalid UUID format - treat as not found
      return null
    }
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return talent
})
